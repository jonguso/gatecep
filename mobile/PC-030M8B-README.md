# PC-030M8B — Sequential Portfolio Analysis Navigation

The seven focused Portfolio Analysis screens now form one continuous journey.

- Header action: return to the parent Analysis overview.
- Upper journey action: move to the previous detail screen.
- Lower journey action: continue to the next detail screen.
- Position remains visible as `N of 7`.
- The first Previous action is disabled.
- The seventh screen finishes back at the Analysis overview.
- Every transition resets the scroll position to the top of the new screen.

The canonical REAL analytics services and all seven existing detail contracts remain unchanged.

Verify with:

```bash
chmod +x scripts/verify-pc030m8b-analysis-sequential-navigation.sh
bash scripts/verify-pc030m8b-analysis-sequential-navigation.sh
```
