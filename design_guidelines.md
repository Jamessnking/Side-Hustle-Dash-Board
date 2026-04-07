{
  "product": {
    "name": "Ultimate Deployment Dashboard",
    "type": "saas_dashboard",
    "audience": "Solo entrepreneur / content creator running multiple side hustles and Instagram accounts",
    "brand_attributes": [
      "premium",
      "professional",
      "fast",
      "trustworthy",
      "command-center",
      "quietly-confident (no flashy gradients)"
    ]
  },
  "visual_personality": {
    "style_fusion": {
      "base": "Linear-like dark minimalism (tight hierarchy, crisp borders)",
      "layout": "Notion/Vercel command-center density (sidebar + top command bar + modular panels)",
      "accent": "Ops/monitoring vibe (status colors, progress, subtle glow)"
    },
    "do_not": [
      "No purple-forward theme",
      "No heavy animations on tables",
      "No gradient-heavy UI (follow gradient restriction rule)",
      "No centered reading layout"
    ]
  },
  "design_tokens": {
    "css_custom_properties": {
      "notes": "Implement by overriding Tailwind/shadcn HSL tokens in /app/frontend/src/index.css under .dark. Keep values as HSL triplets (no hsl()).",
      "core": {
        "--background": "222 22% 6%",
        "--foreground": "210 20% 96%",
        "--card": "222 22% 8%",
        "--card-foreground": "210 20% 96%",
        "--popover": "222 22% 8%",
        "--popover-foreground": "210 20% 96%",
        "--muted": "222 18% 12%",
        "--muted-foreground": "215 14% 70%",
        "--border": "222 16% 16%",
        "--input": "222 16% 16%",
        "--ring": "173 80% 45%",
        "--radius": "0.75rem"
      },
      "brand": {
        "--primary": "173 80% 42%",
        "--primary-foreground": "222 22% 8%",
        "--secondary": "222 18% 12%",
        "--secondary-foreground": "210 20% 96%",
        "--accent": "222 18% 12%",
        "--accent-foreground": "210 20% 96%"
      },
      "state_colors": {
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "210 20% 96%",
        "--success": "142 70% 40%",
        "--warning": "38 92% 50%",
        "--info": "199 88% 48%"
      },
      "charts": {
        "--chart-1": "173 80% 42%",
        "--chart-2": "142 70% 40%",
        "--chart-3": "38 92% 50%",
        "--chart-4": "199 88% 48%",
        "--chart-5": "262 40% 60%"
      },
      "extra_tokens_to_add": {
        "--surface-2": "222 18% 10%",
        "--surface-3": "222 16% 14%",
        "--shadow-color": "0 0% 0%",
        "--focus": "173 80% 45%"
      }
    },
    "tailwind_usage_notes": {
      "background_layers": [
        "App canvas: bg-background",
        "Sidebar: bg-card/60 with backdrop-blur (only if performance ok)",
        "Panels: bg-card",
        "Hover rows: bg-muted/40"
      ],
      "borders": "Prefer subtle borders: border-border/70; avoid high-contrast outlines",
      "shadows": "Use small, realistic shadows: shadow-[0_1px_0_hsl(var(--border)/0.6)] and shadow-[0_12px_40px_rgba(0,0,0,0.35)] for modals only"
    }
  },
  "typography": {
    "font_pairing": {
      "display": "Space Grotesk (600-700)",
      "body": "Inter (400-600)",
      "mono": "IBM Plex Mono (400-500) for IDs, URLs, logs"
    },
    "implementation": {
      "google_fonts": [
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
      ],
      "css": {
        "body": "font-family: Inter, ui-sans-serif, system-ui;",
        "headings": "font-family: Space Grotesk, ui-sans-serif, system-ui;",
        "mono": "font-family: IBM Plex Mono, ui-monospace, SFMono-Regular;"
      }
    },
    "text_size_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm md:text-base",
      "small": "text-xs"
    },
    "type_rules": [
      "Use tab/page titles in Space Grotesk 600 with tracking-tight",
      "Use numeric KPIs in tabular-nums (Tailwind: tabular-nums)",
      "Use mono for tokens/API keys and URLs"
    ]
  },
  "layout": {
    "app_shell": {
      "structure": "Left sidebar (collapsible) + top command bar + main content area with page header + content panels",
      "grid": {
        "desktop": "Main content max-w-none; use 12-col grid inside pages: grid grid-cols-12 gap-4 lg:gap-6",
        "page_padding": "px-4 sm:px-6 lg:px-8 py-5",
        "panel_radius": "rounded-xl",
        "panel_spacing": "space-y-4 lg:space-y-6"
      },
      "sidebar": {
        "width": "w-[280px] (expanded), w-[76px] (collapsed)",
        "behavior": "Desktop: resizable optional (shadcn resizable). Mobile: Sheet drawer.",
        "nav_item": "Use button variants with left icon + label; active state uses bg-muted/60 + border-l-2 border-primary"
      },
      "top_bar": {
        "elements": [
          "Breadcrumb",
          "Global search / Command palette trigger (Cmd+K)",
          "Quick actions: New Download, New Prompt, New Module",
          "User menu"
        ],
        "height": "h-14",
        "style": "bg-background/60 backdrop-blur supports; border-b border-border/70"
      }
    },
    "page_templates": {
      "overview_dashboard": {
        "pattern": "KPI bento grid + recent jobs table + quick actions",
        "sections": [
          "KPI cards (downloads today, queued jobs, IG accounts healthy, trend alerts)",
          "Active jobs (progress list)",
          "Recent content (thumbnail strip)",
          "System status (integrations/API keys)"
        ]
      },
      "downloader_pages": {
        "pattern": "Split: left input/form + right results list",
        "left": "Card with URL input, options (transcribe, analyze), destination (Dropbox), start button",
        "right": "Table/list with status badges + progress + actions"
      },
      "content_library": {
        "pattern": "Toolbar (filters/search/view toggle) + grid/table",
        "grid": "Masonry-like card grid: grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4",
        "table": "Dense table with sticky header + row hover"
      },
      "kanban_planner": {
        "pattern": "Horizontal scroll columns + draggable cards",
        "notes": "Use minimal motion; only animate drag shadow + drop indicator"
      }
    }
  },
  "components": {
    "component_path": {
      "navigation": [
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/separator.jsx",
        "/app/frontend/src/components/ui/collapsible.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/breadcrumb.jsx"
      ],
      "command_search": [
        "/app/frontend/src/components/ui/command.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/input.jsx"
      ],
      "forms": [
        "/app/frontend/src/components/ui/form.jsx",
        "/app/frontend/src/components/ui/label.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/textarea.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/switch.jsx",
        "/app/frontend/src/components/ui/checkbox.jsx"
      ],
      "data_display": [
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/avatar.jsx",
        "/app/frontend/src/components/ui/hover-card.jsx"
      ],
      "overlays": [
        "/app/frontend/src/components/ui/popover.jsx",
        "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "/app/frontend/src/components/ui/alert-dialog.jsx",
        "/app/frontend/src/components/ui/toast.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ],
      "layout_utilities": [
        "/app/frontend/src/components/ui/resizable.jsx",
        "/app/frontend/src/components/ui/accordion.jsx"
      ]
    },
    "custom_components_to_create": [
      {
        "name": "AppShell",
        "purpose": "Sidebar + TopBar + content outlet; handles mobile Sheet",
        "key_parts": [
          "SidebarNav",
          "TopCommandBar",
          "MainContent"
        ]
      },
      {
        "name": "StatusBadge",
        "purpose": "Consistent statuses: queued/downloading/complete/failed",
        "variants": [
          "queued (muted)",
          "running (info)",
          "complete (success)",
          "failed (destructive)",
          "needs-auth (warning)"
        ]
      },
      {
        "name": "JobProgressRow",
        "purpose": "Row with title, source icon, progress bar, ETA, actions",
        "notes": "Use Progress + Badge + DropdownMenu"
      },
      {
        "name": "ContentCard",
        "purpose": "Thumbnail + metadata + tags + quick actions",
        "notes": "Use AspectRatio + Card + Badge"
      },
      {
        "name": "KpiCard",
        "purpose": "Bento KPI with sparkline placeholder",
        "notes": "Use Card; optional Recharts later"
      },
      {
        "name": "KanbanColumn / KanbanCard",
        "purpose": "Planner board UI",
        "notes": "Use Card + Badge; integrate dnd-kit"
      }
    ]
  },
  "component_specs": {
    "buttons": {
      "style": "Professional/Corporate with premium softness",
      "tokens": {
        "radius": "rounded-lg",
        "primary": "bg-primary text-primary-foreground hover:bg-primary/90",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "ghost": "hover:bg-muted/60"
      },
      "micro_interactions": [
        "Hover: subtle brightness + border emphasis (no scale on dense tables)",
        "Press: active translate-y-[1px] on primary CTAs only",
        "Focus: ring-2 ring-[hsl(var(--focus))]/40 ring-offset-0"
      ]
    },
    "inputs": {
      "style": "Dark inset fields with clear focus",
      "classes": "bg-[hsl(var(--surface-2))] border-border/80 focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))]/40",
      "url_input": "Use mono font for URL fields: font-mono text-xs md:text-sm"
    },
    "tables": {
      "density": "Compact",
      "header": "sticky top-0 bg-background/80 backdrop-blur border-b border-border/70",
      "row": "hover:bg-muted/40",
      "no_heavy_motion": "Avoid row animations; only hover color transition"
    },
    "badges": {
      "status": {
        "queued": "bg-muted text-foreground/80 border border-border/70",
        "running": "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border border-[hsl(var(--info))]/30",
        "complete": "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30",
        "failed": "bg-destructive/15 text-destructive border border-destructive/30",
        "warning": "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/30"
      }
    },
    "cards": {
      "base": "rounded-xl border border-border/70 bg-card",
      "hover": "hover:border-border hover:bg-card/95",
      "header": "flex items-start justify-between gap-3",
      "footer": "border-t border-border/70 pt-3"
    },
    "tabs": {
      "usage": "Use Tabs for sub-views inside a module (e.g., Library: Grid/Table; IG: Accounts/Rules/Scheduler)",
      "style": "TabsList bg-muted/40 border border-border/70 rounded-lg"
    }
  },
  "motion": {
    "principles": [
      "Motion is functional: reveal hierarchy, confirm actions, indicate progress",
      "Prefer 120–180ms for hover/focus transitions",
      "Avoid animating layout in tables; animate overlays and progress only"
    ],
    "recommended_library": {
      "name": "framer-motion",
      "install": "npm i framer-motion",
      "use_cases": [
        "Sidebar collapse/expand",
        "Dialog/Sheet entrance",
        "Kanban drag overlay shadow",
        "Empty state subtle fade"
      ]
    },
    "micro_interactions": {
      "progress": "Progress bar should animate width only (transition-[width] duration-300)",
      "sidebar_active": "Active nav item gets left border + subtle glow via box-shadow",
      "command_palette": "Dialog opens with opacity + translate-y (small)"
    }
  },
  "data_viz": {
    "library": {
      "name": "recharts",
      "install": "npm i recharts",
      "usage": "Use for KPI sparklines + trend analyzer charts. Keep charts minimal: 1-2 series, muted gridlines, tooltip with Card styling."
    },
    "chart_style": {
      "grid": "stroke: hsl(var(--border) / 0.6)",
      "axis": "tick fill: hsl(var(--muted-foreground))",
      "series": {
        "primary": "hsl(var(--primary))",
        "success": "hsl(var(--success))",
        "warning": "hsl(var(--warning))"
      }
    }
  },
  "kanban_drag_drop": {
    "library": {
      "name": "@dnd-kit/core",
      "install": "npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities",
      "notes": "Use for Trello-style planner. Keep drag preview lightweight; no springy animations."
    }
  },
  "accessibility": {
    "rules": [
      "WCAG AA contrast for text on dark surfaces",
      "Visible focus rings on all interactive elements",
      "Keyboard navigation: sidebar, tabs, command palette",
      "Use aria-label for icon-only buttons",
      "Respect prefers-reduced-motion (disable non-essential motion)"
    ]
  },
  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid (kebab-case, role-based).",
    "examples": {
      "sidebar": {
        "nav_item": "data-testid=\"sidebar-nav-item-skool-downloader\"",
        "collapse": "data-testid=\"sidebar-collapse-button\""
      },
      "command": {
        "open": "data-testid=\"command-palette-open-button\"",
        "input": "data-testid=\"command-palette-input\""
      },
      "downloader": {
        "url": "data-testid=\"skool-url-input\"",
        "submit": "data-testid=\"skool-download-submit-button\"",
        "job_row": "data-testid=\"download-job-row\""
      },
      "library": {
        "search": "data-testid=\"content-library-search-input\"",
        "filter": "data-testid=\"content-library-source-filter\"",
        "view_toggle": "data-testid=\"content-library-view-toggle\""
      }
    }
  },
  "image_urls": {
    "background_textures": [
      {
        "url": "https://images.unsplash.com/photo-1602475063211-3d98d60e3b1f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjBncmFkaWVudCUyMHRleHR1cmUlMjBub2lzZXxlbnwwfHx8YmxhY2t8MTc3NTU5Mjg5Nnww&ixlib=rb-4.1.0&q=85",
        "category": "noise_texture",
        "description": "Subtle dark textile/noise overlay for the app background (use opacity 0.06–0.10)."
      },
      {
        "url": "https://images.pexels.com/photos/18599094/pexels-photo-18599094.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "category": "grain_texture",
        "description": "Grainy texture for hero/overview header strip only (keep under 20% viewport)."
      }
    ],
    "optional_marketing_header": [
      {
        "url": "https://images.unsplash.com/photo-1602654435744-6e9b86a3d72c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxkYXJrJTIwb2ZmaWNlJTIwZGVzayUyMGxhcHRvcCUyMGJsdWUlMjBuZW9ufGVufDB8fHxibHVlfDE3NzU1OTI5MDJ8MA&ixlib=rb-4.1.0&q=85",
        "category": "header_image",
        "description": "If you add a small header image in Overview (not required). Use as a 16:9 banner inside a Card with overlay gradient at 10–15% opacity."
      }
    ]
  },
  "instructions_to_main_agent": {
    "global_css_changes": [
      "Remove/ignore default CRA App.css centering patterns; do not use .App-header layout.",
      "Set dark mode as default by applying className=\"dark\" on the root html/body wrapper (or in App root).",
      "Override /app/frontend/src/index.css .dark tokens to match the token set above.",
      "Add font imports in index.html or via CSS import; set body/headings font families."
    ],
    "app_shell_build": [
      "Build AppShell with Sidebar + TopCommandBar + main outlet.",
      "Sidebar uses ScrollArea; mobile uses Sheet.",
      "Add Command Palette using Command + Dialog; open with Cmd+K and a top-bar button.",
      "Use Tabs inside modules; use routing for main modules."
    ],
    "module_ui_notes": [
      "Downloader modules: left form card + right results table; show Progress + StatusBadge.",
      "Content Library: toolbar with search/filter + grid/table toggle; thumbnails via AspectRatio.",
      "Instagram Management: Tabs for Accounts / Rules / Scheduler; use Table for accounts and Form for rules.",
      "Trend Analyzer: KPI cards + charts (Recharts) + table of trending audio.",
      "Prompt Creator: split view list + editor (Textarea) + tags.",
      "Planner: Kanban with dnd-kit; keep animations minimal.",
      "Create New Module: wizard-like form in Dialog/Sheet; confirm with Sonner toast.",
      "Settings: API keys vault uses AlertDialog for reveal/copy; always mask secrets by default."
    ],
    "performance": [
      "Avoid backdrop-blur on large scrolling tables; keep blur limited to top bar only.",
      "Use Skeleton for loading states.",
      "Prefer virtualization later if tables grow (not required now)."
    ]
  }
}

---

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
