import { useEffect, useState, type ReactNode } from "react";
import type { DivIcon, PointExpression } from "leaflet";
import L from "leaflet";
import { CheckSquare2, Square } from "lucide-react";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Pane,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type StatusIconProps = {
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
        "rounded-md border p-4 shadow-sm",
        accent
          ? "border-primary/15 bg-primary text-primary-foreground"
          : "border-border bg-card text-card-foreground",
      )}
    >
      <span
        className={cn(
          "mb-1.5 block",
          accent ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <strong>{value}</strong>
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
    <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div>
        <h2>{title}</h2>
        {description ? (
          <p className="max-w-prose text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function StatusIcon({ completed }: StatusIconProps) {
  const Icon = completed ? CheckSquare2 : Square;

  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-4",
        completed ? "text-primary" : "text-muted-foreground",
      )}
    />
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
  const completeAll = () => setCompletedIds(races.map((race) => race.id));

  return (
    <div className="container mx-auto min-h-screen max-w-7xl px-4 py-4 sm:py-6">
      <header className="mb-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div>
          <h1 className="mb-3.5 text-2xl">K-Drive Race Tracker</h1>
          <p className="text-muted-foreground">
            Click any marker on the map or any row in the table to mark a race
            as completed.
            <br />
            Your progress is stored locally in this browser.
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

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
        <Panel>
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
              <div className="flex flex-wrap gap-2">
                <Button onClick={clearAll} type="button" variant="secondary">
                  Clear all
                </Button>
                <Button onClick={completeAll} type="button" variant="secondary">
                  Complete all
                </Button>
              </div>
            }
            title="Race List"
          />

          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Race</TableHead>
                <TableHead>Gates</TableHead>
                <TableHead>Standing</TableHead>
                <TableHead>Affinity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {races.map((race: Race) => {
                const isCompleted = completed.has(race.id);
                const isFocused = focusedRaceId === race.id;
                const rowClassName = cn(
                  "cursor-pointer",
                  isCompleted
                    ? isFocused
                      ? "bg-primary/15 hover:bg-primary/15"
                      : "bg-primary/10 hover:bg-primary/10"
                    : isFocused
                      ? "bg-accent hover:bg-accent"
                      : undefined,
                );

                return (
                  <TableRow
                    key={race.id}
                    className={rowClassName}
                    onClick={() => toggleRace(race.id)}
                    onMouseEnter={() => setFocusedRaceId(race.id)}
                    onMouseLeave={() => setFocusedRaceId(null)}
                  >
                    <TableCell>
                      <StatusIcon completed={isCompleted} />
                    </TableCell>
                    <TableCell>{race.name}</TableCell>
                    <TableCell>{race.gates}</TableCell>
                    <TableCell>{formatNumber(race.standing)}</TableCell>
                    <TableCell>{formatNumber(race.affinity)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      </main>
    </div>
  );
}

export default App;
