# Development Guide

## Hot Reloading / Auto-reload

The React development server (`npm start`) **already includes hot reloading** by default. When you save a file, the browser should automatically refresh.

### If hot reloading is not working:

1. **Make sure you're running `npm start`** (not `npm run build`)
2. **Check the terminal** - you should see "webpack compiled" messages when you save files
3. **WSL file watching issues**: If you're using WSL and hot reloading doesn't work, try:
   - Make sure you're editing files from within WSL (not Windows Explorer)
   - The file watcher should work automatically, but if not, restart the dev server

### How it works:

- `react-scripts start` uses webpack-dev-server with Hot Module Replacement (HMR)
- Changes to `.jsx`, `.js`, `.css` files automatically trigger a reload
- The browser should refresh automatically - you don't need to manually refresh

### Running the application:

**Server (Backend):**
```bash
cd server
npm run dev
```

**Client (Frontend):**
```bash
cd client
npm start
```

The client will open automatically at `http://localhost:3000` and will reload when you make changes.

