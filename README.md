# Codebase Permission Mapper

A comprehensive tool for automatically scanning, mapping, and visualizing the relationship between backend API endpoints, required permissions, and the roles that possess them.

## Quick Start (No Build Required)

1. Download `Permission Mapper-1.3.0.exe` from the `release/` folder
2. Double-click to run
3. Select your backend source code directory
4. Click "Run Analysis"

---

## Building from Source

### Prerequisites

- **Node.js 18+** - Required only for building
- **npm** or **yarn**

### Build Steps

```bash
# 1. Install root dependencies
npm install

# 2. Install visualizer dependencies
cd visualizer && npm install && cd ..

# 3. Build portable executable
npm run dist:portable
```

The executable will be created at `release/Permission Mapper-1.3.0.exe`.

### Alternative Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run visualizer in development mode |
| `npm run build` | Build visualizer only |
| `npm run dist:portable` | Build portable .exe |
| `npm run dist:win` | Build installer + portable |

---

## Usage

1. **Select Source Directory** - Choose your backend code folder (Express, NestJS, etc.)
2. **Select Database (Optional)** - SQLite database with roles/permissions, or use mock data
3. **Run Analysis** - Scans endpoints, builds permission matrix, generates audit report
4. **View Results** - Navigate Matrix View, Endpoint Analyzer, Audit, Roles, Permissions
5. **Export** - Save results as JSON via File menu

---

## System Requirements

- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4GB minimum
- **Disk**: ~200MB

---

## Architecture

```
permission-mapper/
├── electron-main.js      # Electron main process
├── preload.js            # IPC bridge
├── scanner/              # Code scanning engine
├── context-engine/       # Database integration
├── visualizer/           # React dashboard
│   ├── src/             # Source code
│   └── dist/            # Built output
├── build/               # Build resources (icons)
├── release/             # Built executables
├── mapper.config.json   # Configuration
└── package.json
```

---

## Configuration

Edit `mapper.config.json` to customize:

```json
{
  "scanner": {
    "framework": "express",
    "fileExtensions": [".js", ".ts"],
    "excludePatterns": ["node_modules", "dist", "build"]
  }
}
```

---

## License

MIT License

