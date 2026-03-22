# 🔐 Codebase Permission Mapper

<div align="center">

![Codebase Permission Mapper](https://img.shields.io/badge/Permission%20Mapper-Security-6366f1?style=for-the-badge&logo=shield&logoColor=white)
[![Version](https://img.shields.io/badge/Version-1.4.0-blue?style=for-the-badge)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Analyze your source code, map permissions to endpoints, and visualize role-based access control**

*Scan your backend. Discover permissions. Understand who can do what.*

**Author: Deepak Ashok Karai**

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Auto-Detection** | Automatically detects frameworks (Express, NestJS, Fastify, Next.js, etc.) |
| 🔐 **Permission Mapping** | Maps required permissions to each endpoint |
| 👥 **Role Analysis** | Loads roles and their permissions from SQLite database |
| 📊 **Access Matrix** | Visual matrix showing which roles can access which endpoints |
| 🔎 **Audit Report** | Identifies unprotected endpoints and over-privileged roles |
| 💾 **SQLite Support** | Reads directly from your existing permissions database |
| 🎨 **Visual Dashboard** | Electron-based GUI with interactive views |
| 📤 **JSON Export** | Export analysis results for further processing |

---

## 📦 Install

### Option 1: Pre-built Executable (Recommended)

```bash
# Download the portable executable from release folder
```
release/Permission Mapper-1.4.0.exe
```
```

### Option 2: Build from Source

```bash
# Clone the repository
git clone <repo-url>
cd permission-mapper

# Install dependencies
npm install
cd visualizer && npm install && cd ..

# Build portable executable
npm run dist:portable
```

### Requirements
- **Node.js 16+** - Only required for building
- **npm** or **yarn**
- **Windows 10+** - For running the executable

---

## 🚀 Quick Start

### Using the GUI

1. Launch `Permission Mapper-1.4.0.exe`
2. **Select Source Directory** - Choose your backend source code folder
3. **Select Database** (Optional) - Point to your SQLite database with roles/permissions tables
4. **Run Analysis** - Click "Run Analysis" to scan and map
5. **Explore Results** - Navigate through Matrix, Endpoints, Roles, and Permissions views

### Expected Database Schema

The tool expects these tables in your SQLite database:

```sql
-- Roles table
CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  level INTEGER
);

-- Permissions table
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  key TEXT,
  name TEXT,
  description TEXT,
  category TEXT
);

-- Role-Permission mappings
CREATE TABLE role_permissions (
  role_id INTEGER,
  permission TEXT
);
```

---

## 🎯 Usage Examples

### Basic Analysis

```bash
# Run scanner only
npm run scan -- ./src

# Run context engine only
npm run map

# Full analysis pipeline
npm run full
```

### Configuration

Edit `mapper.config.json` to customize scanning behavior:

```json
{
  "scanner": {
    "framework": "express",
    "fileExtensions": [".js", ".ts", ".jsx", ".tsx"],
    "excludePatterns": ["node_modules", "dist", "build", ".git"]
  }
}
```

### Export Results

After analysis, export the permission map from the File menu as JSON.

---

## 📊 Dashboard Views

### 1. Matrix View
The access matrix shows which roles can access which endpoints.

```
┌─────────────────────────────────────────────────┐
│  PERMISSION ACCESS MATRIX                      │
├─────────────────────────────────────────────────┤
│  Endpoint          │ ADMIN │ CLERK │ GUEST     │
│  ─────────────────────────────────────────────  │
│  GET  /api/users   │   ✓   │   ✓   │   -       │
│  POST /api/users   │   ✓   │   -   │   -       │
│  DELETE /api/users │   ✓   │   -   │   -       │
│  GET  /api/reports │   ✓   │   ✓   │   -       │
└─────────────────────────────────────────────────┘
```

### 2. Endpoint Analyzer
Click any endpoint to see:
- Required permissions
- Accessible roles
- File location and line number
- Security recommendations

### 3. Audit View
Automatic security analysis:
- **Unprotected Endpoints** - Endpoints without permission checks
- **Over-privileged Access** - Endpoints accessible by too many roles
- **Orphan Permissions** - Permissions not used by any endpoint

### 4. Roles View
Explore role definitions:
- Permission count per role
- Endpoints accessible by each role
- Visual permission breakdown

### 5. Permissions View
Browse all permissions:
- Grouped by category
- Search functionality
- Shows which roles have each permission

---

## 🔧 Supported Frameworks

- **Express.js** - Most popular Node.js framework
- **NestJS** - Progressive Node.js framework
- **Fastify** - Fast, low-overhead web framework
- **Next.js** - API routes in Next.js applications
- **Hapi** - Rich framework for Node.js
- **Koa** - Expressive middleware for Node.js
- **Sails.js** - MVC framework for Node.js
- **AdonisJS** - Laravel-like framework
- **LoopBack** - IBM's Node.js framework
- **tRPC** - End-to-end typesafe APIs
- **Feathers** - Real-time framework

### Permission Detection Patterns

The scanner recognizes these permission patterns in your code:

```javascript
// Constant references
router.post('/users', requireAuth, requirePermission(PERMISSIONS.USERS_CREATE));

// Direct strings
router.get('/reports', requirePermission('reports.view'));

// Middleware decorators (NestJS)
@UseGuards(RolesGuard)
@RequirePermissions('users.manage')

// Custom check functions
router.put('/settings', checkPermission('settings.write'));
```

---

## 📋 Application Menu

| Menu | Options |
|------|---------|
| **File** | Export JSON, Exit |
| **View** | Toggle DevTools (debug) |
| **Help** | About, Version |

---

## 🛠️ Development

```bash
# Install all dependencies
npm run setup

# Run visualizer in dev mode
npm run dev

# Build visualizer only
npm run build

# Run electron in dev mode
npm run electron:dev

# Run electron in production mode
npm run electron:start
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

## 📄 License

MIT License - feel free to use it in your projects!

---

## 🙏 Acknowledgments

Built with ❤️ by **Deepak Ashok Karai**

Using these amazing technologies:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Fast build tool
- [Radix UI](https://www.radix-ui.com/) - Unstyled component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [sql.js](https://sql.js.org/) - SQLite in JavaScript

---

<div align="center">

**Made with ❤️ for developers who care about security**

*If you find this useful, star the repo! ⭐*

</div>
