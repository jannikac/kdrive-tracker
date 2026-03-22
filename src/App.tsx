import { useEffect, useState, type ReactNode } from "react";
import type { DivIcon, PointExpression } from "leaflet";
import L from "leaflet";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Pane,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { races, type LabelSide, type Race } from "./races";

const STORAGE_KEY = "kdrive-race-progress";
const MAP_WIDTH = 4000;
const IMAGE_HEIGHT = 4000;
const mapBounds: [[number, number], [number, number]] = [
  [0, 0],
  [IMAGE_HEIGHT, MAP_WIDTH],
];
const RIGHT_LABEL_OFFSET: PointExpression = [6, -8];
const LEFT_LABEL_OFFSET: PointExpression = [-16, -8];

type RaceIconOptions = {
  completed: boolean;
  active: boolean;
};

type RaceMapProps = {
  completed: Set<string>;
  focusedRaceId: string | null;
  onToggle: (raceId: string) => void;
  onFocus: (raceId: string | null) => void;
};

type Totals = {
  completed: number;
  gates: number;
  standing: number;
  affinity: number;
};

type SummaryCardProps = {
  label: string;
  value: ReactNode;
  accent?: boolean;
};

type PanelProps = {
  children: ReactNode;
  className?: string;
};

type PanelHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

type TableCellProps = {
  children: ReactNode;
  as?: "td" | "th";
};

type StatusPillProps = {
  completed: boolean;
};

function getRaceIconHtml({ completed, active }: RaceIconOptions): string {
  const pinFilter = active
    ? "drop-shadow(0 6px 14px rgba(0, 0, 0, 0.34))"
    : "drop-shadow(0 5px 10px rgba(0, 0, 0, 0.28))";
  const pinTransform = active ? "scale(1.1)" : "scale(1)";
  const pinOpacity = completed ? "0.82" : "1";
  const markerShapeFill = completed ? "#8b959d" : "#fa005a";
  const markerCircleFill = completed ? "#3c464d" : "#0E191A";
  const markerCircleOpacity = completed ? "0.55" : ".5";

  return `
      <span
        aria-hidden="true"
        style="
          display:inline-block;
          width:20.13px;
          height:26px;
          filter:${pinFilter};
          transform-origin:50% 100%;
          transform:${pinTransform};
          opacity:${pinOpacity};
          transition:transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 31"
          height="26"
          width="20.129032258064516"
          style="display:block;overflow:visible;"
        >
          <path
            stroke="#fff"
            stroke-width="2"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M17.91 20.1A9.99 9.99 0 0012 2.03 10 10 0 006.09 20.1c1.88 1.42 4.53 3.65 5.14 7.25a.8.8 0 00.77.68c.39 0 .7-.3.77-.68.61-3.6 3.26-5.83 5.14-7.25z"
            fill="${markerShapeFill}"
          ></path>
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="${markerCircleFill}"
            fill-opacity="${markerCircleOpacity}"
          ></circle>
          <text
            font-size="12px"
            y="50%"
            x="50%"
            text-anchor="middle"
            fill="#fff"
            font-weight="bold"
          >🛹</text>
        </svg>
      </span>`;
}

function getMarkerLabelClassName(completed: boolean, active: boolean): string {
  return cn(completed && "is-complete", active && "translate-y-[-1px]");
}

// Marker SVG adapted from the Orb Vallis map on the Warframe wiki:
// https://wiki.warframe.com/w/Orb_Vallis/Map
const raceIcon = ({ completed, active }: RaceIconOptions): DivIcon =>
  L.divIcon({
    className: "border-0 bg-transparent",
    iconSize: [20.13, 26],
    iconAnchor: [10.065, 26],
    tooltipAnchor: [6, -8],
    html: getRaceIconHtml({ completed, active }),
  });

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getInitialCompleted(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function getLabelOffset(labelSide?: LabelSide): PointExpression {
  return labelSide === "left" ? LEFT_LABEL_OFFSET : RIGHT_LABEL_OFFSET;
}

function SummaryCard({ label, value, accent = false }: SummaryCardProps) {
  return (
    <article
      className={cn(
        "rounded-md border p-[18px] shadow-sm",
        accent
          ? "border-primary/15 bg-primary text-primary-foreground"
          : "border-border bg-card text-card-foreground",
      )}
    >
      <span
        className={cn(
          "mb-1.5 block text-[0.88rem]",
          accent ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <strong className="text-[clamp(1.4rem,2vw,2rem)]">{value}</strong>
    </article>
  );
}

function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function PanelHeader({ title, description, action }: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-[18px] max-[720px]:flex-col">
      <div>
        <h2 className="text-[1.5rem] leading-tight">{title}</h2>
        {description ? (
          <p className="max-w-[60ch] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function TableCell({ children, as = "td" }: TableCellProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        "whitespace-nowrap px-4 py-3.5 text-left max-[720px]:p-3",
        as === "th" &&
          "text-[0.82rem] uppercase tracking-[0.06em] text-muted-foreground",
      )}
    >
      {children}
    </Component>
  );
}

function StatusPill({ completed }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[58px] items-center justify-center rounded-md px-2.5 py-1.5 text-[0.8rem]",
        completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {completed ? "Done" : "Open"}
    </span>
  );
}

function RaceMap({
  completed,
  focusedRaceId,
  onToggle,
  onFocus,
}: RaceMapProps) {
  return (
    <MapContainer
      className="w-full aspect-square"
      bounds={mapBounds}
      crs={L.CRS.Simple}
      maxBounds={mapBounds}
      maxBoundsViscosity={1}
      minZoom={-2}
      zoomSnap={0.25}
      scrollWheelZoom
      attributionControl={false}
    >
      <ImageOverlay bounds={mapBounds} url="/assets/OrbVallisBaseMap.png" />
      <Pane name="markers" style={{ zIndex: 600 }}>
        {races.map((race: Race) => {
          const isCompleted = completed.has(race.id);
          const isFocused = focusedRaceId === race.id;

          return (
            <Marker
              key={`${race.id}-${isCompleted ? "done" : "open"}-${isFocused ? "focused" : "idle"}`}
              eventHandlers={{
                click: () => onToggle(race.id),
                mouseover: () => onFocus(race.id),
                mouseout: () => onFocus(null),
              }}
              icon={raceIcon({ completed: isCompleted, active: isFocused })}
              position={[race.y, race.x]}
            >
              <Tooltip
                className={getMarkerLabelClassName(isCompleted, isFocused)}
                direction={race.labelSide === "left" ? "left" : "right"}
                offset={getLabelOffset(race.labelSide)}
                opacity={1}
                permanent
              >
                {race.name}
              </Tooltip>
            </Marker>
          );
        })}
      </Pane>
    </MapContainer>
  );
}

function App() {
  const [completedIds, setCompletedIds] = useState<string[]>(() =>
    getInitialCompleted(),
  );
  const [focusedRaceId, setFocusedRaceId] = useState<string | null>(null);
  const completed = new Set(completedIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
  }, [completedIds]);

  const totals = races.reduce<Totals>(
    (accumulator, race) => {
      if (completed.has(race.id)) {
        accumulator.completed += 1;
        accumulator.gates += race.gates;
        accumulator.standing += race.standing;
        accumulator.affinity += race.affinity;
      }

      return accumulator;
    },
    { completed: 0, gates: 0, standing: 0, affinity: 0 },
  );

  const toggleRace = (raceId: string) => {
    setCompletedIds((current) =>
      current.includes(raceId)
        ? current.filter((id) => id !== raceId)
        : [...current, raceId],
    );
  };

  const clearAll = () => setCompletedIds([]);

  return (
    <div className="mx-auto min-h-screen w-[min(1500px,calc(100vw-32px))] px-0 py-6 pb-8 max-[720px]:w-[min(100vw-20px,100%)] max-[720px]:pt-3.5">
      <header className="mb-5 grid items-start gap-5 min-[1121px]:grid-cols-[minmax(280px,1.1fr)_minmax(320px,0.9fr)] max-[1120px]:grid-cols-1">
        <div>
          <p className="mb-2 text-[0.78rem] uppercase tracking-[0.2em] text-muted-foreground">
            Orb Vallis
          </p>
          <h1 className="mb-3.5 text-[clamp(2.3rem,3vw,3.8rem)] leading-[0.95]">
            K-Drive Race Tracker
          </h1>
          <p className="max-w-[60ch] text-muted-foreground">
            Click any marker on the map or any row in the table to mark a race
            as completed. Your progress is stored locally in this browser.
          </p>
        </div>
        <div>
          <SummaryCard
            accent
            label="Completed"
            value={`${totals.completed}/${races.length}`}
          />
        </div>
      </header>

      <main className="grid gap-5 min-[1121px]:grid-cols-[minmax(420px,1.2fr)_minmax(380px,0.8fr)] max-[1120px]:grid-cols-1">
        <Panel className="max-[1120px]:min-h-0">
          <PanelHeader title="Race Map" />
          <RaceMap
            completed={completed}
            focusedRaceId={focusedRaceId}
            onFocus={setFocusedRaceId}
            onToggle={toggleRace}
          />
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            action={
              <Button
                onClick={clearAll}
                type="button"
              >
                Clear progress
              </Button>
            }
            title="Race List"
          />

          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-[1] bg-card">
                <tr>
                  <TableCell as="th">Status</TableCell>
                  <TableCell as="th">Race</TableCell>
                  <TableCell as="th">Gates</TableCell>
                  <TableCell as="th">Standing</TableCell>
                  <TableCell as="th">Affinity</TableCell>
                </tr>
              </thead>
              <tbody>
                {races.map((race: Race) => {
                  const isCompleted = completed.has(race.id);
                  const isFocused = focusedRaceId === race.id;
                  const rowClassName = cn(
                    "cursor-pointer border-t border-border transition-colors duration-150 ease-out",
                    isCompleted
                      ? isFocused
                        ? "bg-primary/15"
                        : "bg-primary/10"
                      : isFocused
                        ? "bg-accent"
                        : "hover:bg-muted/60",
                  );

                  return (
                    <tr
                      key={race.id}
                      className={rowClassName}
                      onClick={() => toggleRace(race.id)}
                      onMouseEnter={() => setFocusedRaceId(race.id)}
                      onMouseLeave={() => setFocusedRaceId(null)}
                    >
                      <TableCell>
                        <StatusPill completed={isCompleted} />
                      </TableCell>
                      <TableCell>{race.name}</TableCell>
                      <TableCell>{race.gates}</TableCell>
                      <TableCell>{formatNumber(race.standing)}</TableCell>
                      <TableCell>{formatNumber(race.affinity)}</TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}

export default App;
