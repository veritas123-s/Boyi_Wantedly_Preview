# Distribution file locations

Renderer: [pptx-renderer.js](./pptx-renderer.js).

- [pptx-licenses-ECMA-text-copyright-notice.txt](./pptx-licenses-ECMA-text-copyright-notice.txt)
- [pptx-licenses-ECharts-LICENSE.txt](./pptx-licenses-ECharts-LICENSE.txt)
- [pptx-licenses-ECharts-NOTICE.txt](./pptx-licenses-ECharts-NOTICE.txt)
- [pptx-licenses-ECharts-d3-BSD.txt](./pptx-licenses-ECharts-d3-BSD.txt)
- [pptx-licenses-JSZip-LICENSE.markdown](./pptx-licenses-JSZip-LICENSE.markdown)
- [pptx-licenses-Microsoft-permissive.txt](./pptx-licenses-Microsoft-permissive.txt)
- [pptx-licenses-Pako-MIT.txt](./pptx-licenses-Pako-MIT.txt)
- [pptx-licenses-THIRD_PARTY_NOTICES.md](./pptx-licenses-THIRD_PARTY_NOTICES.md)
- [pptx-licenses-ZRender-LICENSE.txt](./pptx-licenses-ZRender-LICENSE.txt)
- [pptx-licenses-html-to-image-MIT.txt](./pptx-licenses-html-to-image-MIT.txt)
- [pptx-licenses-mtx-decompressor-MPL-2.0.txt](./pptx-licenses-mtx-decompressor-MPL-2.0.txt)
- [pptx-licenses-pptx-renderer-Apache-2.0.txt](./pptx-licenses-pptx-renderer-Apache-2.0.txt)
- [pptx-licenses-renderer-THIRD_PARTY_NOTICES.md](./pptx-licenses-renderer-THIRD_PARTY_NOTICES.md)

The upstream notices below retain their original source file names. This distribution uses the corresponding prefixed file names linked above.

# Classroom projection third-party software

@aiden0z/pptx-renderer 1.4.0: Apache-2.0. https://github.com/aiden0z/pptx-renderer
html-to-image 1.11.13: MIT, Copyright (c) 2017-2025 W.Y. https://github.com/bubkoo/html-to-image
JSZip 3.10.1: MIT license option, Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso. https://github.com/Stuk/jszip
ECharts 6.0.0: Apache-2.0, Copyright The Apache Software Foundation. https://echarts.apache.org/
mtx-decompressor 1.4.2: MPL-2.0; unmodified covered code bundled/minified by upstream. Corresponding source: https://github.com/ChristopherVR/mtx-decompressor/archive/refs/tags/v1.4.2.tar.gz
ECMA mechanically derived geometry: see ECMA-text-copyright-notice.txt and renderer-THIRD_PARTY_NOTICES.md.

Complete upstream license notices are retained in classroom-renderer.js and this directory. No PPT is sent to these authors or services. The local adapter is pptx-tools/classroom-renderer-entry.js; it blocks external relationships, removes hyperlink/media actions and filters SVG active content before static projection.

Additional notices: ZRender (BSD-3-Clause), pako (MIT), ECharts d3 portions (BSD-3-Clause), Microsoft permissive helpers. See adjacent complete license files.

Local modifications (2026-10-20): static ECharts animation disabled and drawing flushed before capture; html-to-image cache explicitly cleared after each capture. Upstream source files are preserved unchanged in the build input directory; these two transformations are defined in build-classroom-renderer.mjs.
The ZIP adapter additionally reads decompressed output incrementally and pauses before exceeding actual per-entry/XML/total limits, including forged archive length declarations. See pptx-tools/bounded-zip-entry.js and the pinned build transformations.
Local modifications (2026-10-22): derive expansion budgets from currently available browser memory, support cancellation during ZIP reads, and reject failed image decoding instead of leaving the capture promise pending.

Local modifications (2026-10-23): propagate AbortSignal through html-to-image clone, resource fetch, FileReader and Image.decode; serialize capture ownership through complete cleanup, reset cancelled image sources and release late canvases. Raster/SVG image dimensions and total decoded-pixel budgets are validated before browser decoding; uncheckable formats are explicitly refused. Build-time transforms are defined in pptx-tools/capture-patches.mjs; licensed upstream source files remain unchanged.
