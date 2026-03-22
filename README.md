# kdrive-tracker

Tracker for K-Drive races in Orb Vallis.

## AI Usage

AI was used in the creation of this tool. I tweaked the appearannce and internal implementation to be more sound.

## Motivation

This project exists as a lightweight companion for the Orb Vallis K-Drive races in Warframe.
I needed a way to track completed K-Drive races to get the Race Ace Steam achievment. While the checklist on the [wiki](https://wiki.warframe.com/w/K-Drive_Race/Chart) is nice you have to constantly switch between the Map and Checklist to see what races you still need to to. To solve this problem I built this.

## Usage

The tracker is hosted here: [jannikac.github.io/kdrive-tracker/](https://jannikac.github.io/kdrive-tracker/).

Your progress is stored with the browser `localStorage` API. That means:

- Your completed races stay saved when you refresh the page or reopen the browser.
- The data is tied to the specific browser and device you used.
- Progress will not automatically sync between different browsers, devices, or private/incognito windows.
- If you clear site data or browser storage, your saved checklist will be removed.

In this app, the race progress is stored locally under the key `kdrive-race-progress`.

## Contribution

Contributions welcome. Feel free to make a PR or open an issue.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
