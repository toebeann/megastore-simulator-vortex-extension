# Changelog

## [1.3.4] - 2026-04-12

_This update is functionally equivalent to [1.3.2] and [1.3.3], with just the game art changed to not include text as per Nexus Mods requirements._

## [1.3.3] - 2026-04-12

_This update is functionally equivalent to [1.3.2], with just the game art converted to png to make Nexus Mod's staff life easier._

## [1.3.2] - 2026-04-11

### Fixed

- Prevent installers support detection failing when installing mod updates ([`335a487`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/335a487))

## [1.3.1] - 2026-04-11

### Fixed

- Correctly determine best source <-> destination mapping when archive is rooted to game folder ([`6607a4d`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/6607a4d))

## [1.3.0] - 2026-04-11

### Added

- Implement fallback installer for unknown mod types ([`eb2fb11`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/eb2fb11))
  Where possible, attempts to intelligently calculate appropriate installation location by comparing archive folder structure with game folder structure, otherwise simply installs archive contents directly to game folder

## [1.2.0] - 2026-04-09

### Added

- Implement installer to handle product packs for [Additional Products](https://www.nexusmods.com/megastoresimulator/mods/34) ([`7a5f2b7`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/7a5f2b7))
  Intelligently calculates appropriate installation location based on `manifest.xml` and archive folder structure

## [1.1.1] - 2026-04-05

### Changed

- Make use of installed .NET 9 runtime where available to reduce extension install size ([`5875cbb`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/5875cbb))
- Use bundled AssetsTools.NET module when falling back to .NET 6 FSX scripting rather than acquiring it from nuget ([`701b1e1`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/701b1e1))

## [1.1.0] - 2026-03-27

### Added

- Implement installer to handle save files ([`102581f`](https://github.com/toebeann/megastore-simulator-vortex-extension/commit/102581f))
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

[1.3.4]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.3.4
[1.3.3]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.3.3
[1.3.2]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.3.2
[1.3.1]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.3.1
[1.3.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.3.0
[1.2.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.2.0
[1.1.1]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.1.1
[1.1.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.1.0
[1.0.0]: https://github.com/toebeann/megastore-simulator-vortex-extension/releases/tag/v1.0.0
