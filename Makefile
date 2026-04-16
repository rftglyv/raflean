# raflean — universal storage cleaner for developers

BUN    ?= bun
NODE   ?= node
DIST   := dist
PREFIX ?= /usr/local

.PHONY: help install cli ui scan preview reclaim \
        build build-cli build-ui clean \
        install-global uninstall-global

.DEFAULT_GOAL := help

help:
	@echo "raflean — make targets"
	@echo ""
	@echo "  setup"
	@echo "    install              install node_modules"
	@echo ""
	@echo "  run (dev)"
	@echo "    cli   ARGS=...       run plain CLI  (e.g. make cli ARGS=\"clean --dry-run\")"
	@echo "    ui    ARGS=...       run Ink TUI"
	@echo "    scan                 raflean diagnose"
	@echo "    preview              raflean clean --dry-run"
	@echo "    reclaim              raflean clean --all"
	@echo ""
	@echo "  compile (single binaries via bun)"
	@echo "    build                build both → $(DIST)/raflean, $(DIST)/raflean-ui"
	@echo "    build-cli            plain CLI only"
	@echo "    build-ui             Ink TUI only"
	@echo "    clean                remove $(DIST)/"
	@echo ""
	@echo "  distribution"
	@echo "    install-global       copy binaries to $(PREFIX)/bin (sudo if needed)"
	@echo "    uninstall-global     remove them from $(PREFIX)/bin"

# ── setup ────────────────────────────────────────────────────────────────────
install:
	npm install

# ── run (dev) ────────────────────────────────────────────────────────────────
cli:
	@$(NODE) bin/raflean.js $(ARGS)

ui:
	@$(NODE) bin/raflean-ui.js $(ARGS)

scan:
	@$(NODE) bin/raflean.js diagnose

preview:
	@$(NODE) bin/raflean.js clean --dry-run

reclaim:
	@$(NODE) bin/raflean.js clean --all

# ── compile ──────────────────────────────────────────────────────────────────
$(DIST):
	@mkdir -p $(DIST)

build-cli: | $(DIST)
	$(BUN) build bin/raflean.js --compile --outfile $(DIST)/raflean
	@echo "→ $(DIST)/raflean"

build-ui: | $(DIST)
	$(BUN) build bin/raflean-ui.js --compile --outfile $(DIST)/raflean-ui
	@echo "→ $(DIST)/raflean-ui"

build: build-cli build-ui

clean:
	rm -rf $(DIST)

# ── distribution ─────────────────────────────────────────────────────────────
install-global: build
	@install -m 755 $(DIST)/raflean    $(PREFIX)/bin/raflean
	@install -m 755 $(DIST)/raflean-ui $(PREFIX)/bin/raflean-ui
	@echo "installed: $(PREFIX)/bin/{raflean, raflean-ui}"

uninstall-global:
	@rm -f $(PREFIX)/bin/raflean $(PREFIX)/bin/raflean-ui
	@echo "removed: $(PREFIX)/bin/{raflean, raflean-ui}"
