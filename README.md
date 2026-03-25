# Megastore Simulator [Vortex] Extension

## Features

- Provides support for Megastore Simulator to [Vortex].
- Automatically detects mod types and installs them to the appropriate locations e.g. BepInEx pack, BepInEx plugins, config files, etc.
- Detects when the game has been updated and informs you that mods might need to be updated.
- Provides easy access to Megastore Simulator's save folder, BepInEx log file and more through the "Open..." button of the Mods tab.

## How to install

> [!WARNING]
> This extension was developed against [Vortex Mod Manager] v1.16.7, and as such I recommend you have at least this version of Vortex installed. I cannot guarantee this extension will function correctly for older versions.

Assuming you have [Vortex] installed, you should be able to simply click the Vortex button at the top of the Nexus Mods page to open this extension within Vortex, and then click `Install`, restarting Vortex when prompted.

If that doesn't work for whatever reason, you can alternatively install the extension manually by manually downloading the main file, and then you can simply drag-and-drop it into the "Drop File(s)" area at the bottom of the Extensions tab in Vortex, restarting Vortex when prompted.

## How can I make my mod compatible with this extension?

Most mods should work as-is. I will be adding support for more mod types as needed as mods get uploaded to Nexus, and I plan to shortly add support for BepInEx patchers, hybrid mods, and more very soon, but for now I just wanted to get a simple v1 available for the mods that already exist.

If you have developed a mod and find that it is not being correctly installed via this extension, reach out to me either via the posts tab on Nexus Mods, the [GitHub issues] tracker, or ping me (@toebean) in the #dev-chat channel of the [Modded Megastore Simulator discord server]. Ideally provide me with a link to your mod page, or an example archive and some info on how it should be installed. I'll make sure to get back to you as soon as I can to let you know whether I will be able to add support for your mod to the extension, and give you tips for how to handle it in the meantime.

<!-- TODO: add info about creating mod installers for advanced use cases https://github.com/Nexus-Mods/Vortex/wiki/MODDINGWIKI-Users-General-How-to-create-mod-installers -->

## License

The Megastore Simulator Vortex Extension project is licensed under the MPL-2.0 license.

Copyright (C) 2026 Tobey Blaber

[Vortex]: https://www.nexusmods.com/about/vortex/
[Vortex Mod Manager]: https://www.nexusmods.com/about/vortex/
[GitHub issues]: https://github.com/toebeann/megastore-simulator-vortex-extension/issues
[Modded Megastore Simulator discord server]: https://discord.gg/9KrRZx7akG
