# Changelog

## [1.1.0]

### Added

- Implement installer to handle save files
    - Handles archives containing files named e.g. `Save_0.data`, `Save_1.data` etc.
    - Archive must not contain binary data outside of the folder containing the save file(s)
    - Supports up to 4 save files in a single archive
    - When running the game after installing save files, Steam might mention your cloud saves are out of sync with your local saves and will ask you to choose which to use. Make sure to choose the local saves!
    - Currently you must have enough empty save slots available, otherwise the save file(s) will not be installed. In future will add the ability to select the save slots to use if there aren't enough empty slots available.
- Implement a changelog GUI to let users know what has changed in each update ([`6cf59e5`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/6cf59e5))
    - Changelog GUI can be opened from the mods tab in the action bar or via a notification when a new update is installed
    - GUI will automatically open whenever an important update has been installed (e.g. breaking change, major version bump)

### Fixed

- Correctly handle files located in or outside of the root folder of the designated mod type ([`b107737`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/b107737))

## [1.0.0] - 2026-03-25

_Initial release 🚀_

[1.0.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.0.0
[1.1.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.1.0
