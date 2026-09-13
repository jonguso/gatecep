# GateCEP Developer Platform

Updated: 2026-09-12

## Status

ACTIVE / VERIFY CURRENT PACKAGE BOUNDARIES

## Release State

GateCEP 5.0 — UAT / Release Stabilization

## Purpose

The `platform/` area owns developer tooling, package-boundary direction, templates, validators, scaffolds and bootstrap utilities. It supports the product architecture; it must not become a second source of business truth.

## Current Rule

Canonical business logic should be consumed through verified shared/domain boundaries. However, historical package-boundary work was not consistently status-maintained. Do not delete an existing runtime bridge or force a package migration solely because an older document says it was planned.

Before changing a boundary:

1. verify current backend/mobile/web imports;
2. identify the active runtime path;
3. verify Metro/Expo and Node compatibility;
4. migrate only if the current code proves the bridge is still debt;
5. preserve compatibility until all consumers pass.

## Target Package Direction

- `@gatecep/shared`
- `@gatecep/config`
- `@gatecep/types`
- `@gatecep/testing`
- `@gatecep/ui`

These remain architectural targets/directions unless current code confirms each package is already the canonical production boundary.

## UAT Constraints

- No broad package refactor during UAT without a reproduced defect.
- No duplicate business engine introduced to solve a client-only issue.
- No root/shared import cleanup that breaks a currently verified runtime.
- Expo web/mobile and backend verification are required when a package boundary changes.

## Current Verified Product Baseline

Responsive UAT closed with 98 active screens accounted for and `REMAINING_UAT_VERIFY: 0`. The platform layer should preserve that baseline while functional UAT continues.
