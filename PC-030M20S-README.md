# PC-030M20S — Web Sector Donut

The Portfolio Home sector donut now uses an explicit square canvas, SVG
`viewBox`, preserved aspect ratio, and transparent background. This prevents
React Native Web from collapsing the chart paths and labels into one text-height
row while preserving the Android/iOS rendering.

Sector drill-down accepts both native and browser pointer coordinates.

The browser uses native DOM `svg`, `path`, and `text` elements because the
React Native SVG web adapter can flatten this chart into ordinary text on some
Windows browser configurations. Android and iOS continue using
`react-native-svg`.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20s-web-sector-donut.sh
npx expo start --clear --lan
```
