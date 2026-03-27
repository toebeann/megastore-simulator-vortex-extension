// @ts-expect-error
import changelogHtml from "../../CHANGELOG.md";

export const getHtml = () =>
  new HTMLRewriter()
    .on("h1", {
      element(h1) {
        h1.before(
          `<div class="changelog-wrapper">
<style>
.dialog-container {
  max-height: 69vh; /* nice */
}

.changelog-wrapper {
  white-space: normal;
}

details > summary {
  cursor: pointer;
  display: flex;
  background: #303030aa;
  padding-left: 1.5rem;
}

details > summary *, details a > * {
  cursor: pointer;
}

details > :not(summary) {
  margin-left: 1.5rem;
}

details > summary .expand {
  color: transparent;
  text-shadow: 0 0 0 #eee;
  margin-left: auto;
  width: 54px;
  height: 54px;
  padding-left: 2.5px;
  font-size: 3em;
  rotate: 90deg;
}

details > ul, details[open] p {
  margin-block: 1.5em;
}

details > ul {
  list-style-type: disc;
  list-style-position: inside;
}

details[open] > summary .expand {
  rotate: 0deg;
}
</style>`,
          { html: true },
        );
      },
    })
    .on("h2", {
      element(h2) {
        h2.after(`<span class="expand">🔻</span></summary>`, { html: true });
      },
    })
    .on("h2:first-of-type", {
      element(h2) {
        h2.before("<details open><summary>", { html: true });
      },
    })
    .on("h2:not(:first-of-type)", {
      element(h2) {
        h2.before("</details><details><summary>", { html: true });
      },
    })
    .onDocument({
      end(end) {
        end.append("</details></div>", { html: true });
      },
    })
    .transform(changelogHtml as string);
