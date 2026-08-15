(function () {
  "use strict";

  function initialise() {
    // Add replacements after Quarto has finalized figures, captions, stretch
    // classes, and video markup; this keeps the original QMD semantics intact.
    document.querySelectorAll(".print-media-source[data-print-media-src]").forEach(function (source) {
      var outer = document.createElement("span");
      outer.className = "print-media print-media-inline";
      var live = document.createElement("span");
      live.className = "print-media-live";
      var still = document.createElement("span");
      still.className = "print-media-static";
      var image = document.createElement("img");
      image.src = source.dataset.printMediaSrc;
      image.alt = source.dataset.printMediaAlt || source.alt || source.title || "Print replacement";
      image.className = source.className.replace(/(?:^|\s)print-media-source(?:\s|$)/g, " ").trim();
      image.style.cssText = source.style.cssText;

      source.removeAttribute("data-print-media-src");
      source.removeAttribute("data-print-media-alt");
      source.classList.remove("print-media-source");
      source.parentNode.insertBefore(outer, source);
      live.appendChild(source);
      still.appendChild(image);
      outer.appendChild(live);
      outer.appendChild(still);
    });

    document.querySelectorAll("img[data-print-media-fallback-src]").forEach(function (image) {
      function useFallback() {
        if (image.dataset.printMediaFallbackSrc && image.src !== image.dataset.printMediaFallbackSrc) {
          image.src = image.dataset.printMediaFallbackSrc;
        }
      }
      image.addEventListener("error", useFallback, { once: true });
      image.addEventListener("load", function () {
        // Missing max-resolution YouTube thumbnails are sometimes returned as
        // a small, valid placeholder image rather than a failed request.
        if (image.naturalWidth && image.naturalWidth <= 320) useFallback();
      }, { once: true });
      if (image.complete && (!image.naturalWidth || image.naturalWidth <= 320)) useFallback();
    });

    var images = Array.prototype.slice.call(document.querySelectorAll(".print-media-static img"));
    window.printMediaReady = Promise.all(images.map(function (image) {
      if (image.complete) {
        return image.decode ? image.decode().catch(function () {}) : Promise.resolve();
      }
      return new Promise(function (resolve) {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })).then(function () {
      document.documentElement.classList.add("print-media-ready");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
