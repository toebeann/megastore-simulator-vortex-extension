import { $ } from "bun";

export const pwsh = async () => {
  try {
    return (await $`where pwsh`.text()).trim();
  } catch {}

  try {
    return (await $`where powershell`.text()).trim();
  } catch {}
};
