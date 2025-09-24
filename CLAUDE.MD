# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an RPA (Robotic Process Automation) desktop application built with Electron. The project aims to automate business processes including inventory management, form filling, and table data extraction across macOS and Windows platforms.

## Technology Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript + Material UI
- **Backend**: Node.js (Electron main process)
- **State Management**: Redux/MobX (planned)
- **Multi-language Runtime Support**: Python, Java, Node.js

## Project Architecture

### Core Modules
1. **Authentication Module**: User login with credential management
2. **Main Dashboard**: Function entry points with card-based navigation
3. **Execution Pages**: Runtime environments with real-time logging and process control
4. **Multi-language Execution Engine**: Support for Python/Java/Node.js script execution with environment detection

### IPC Communication Structure
The application uses Electron's IPC mechanism for main-renderer process communication, particularly for:
- Script execution control and monitoring
- Real-time log streaming
- System resource monitoring (CPU, memory usage)

### Logging System
- **Log Levels**: INFO, WARNING, ERROR, SUCCESS
- **Features**: Real-time scrolling, auto-scroll, search functionality, export capability
- **Performance Requirements**: <200ms display latency

## Development Commands

This project uses **pnpm** as the package manager for better performance and dependency management:

```bash
# Install dependencies
pnpm install

# Development mode (starts both Vite dev server and Electron)
pnpm dev
# or
pnpm start

# Build for production
pnpm build

# Build individual parts
pnpm build:main      # Build Electron main process
pnpm build:renderer  # Build React renderer

# Package application
pnpm electron:pack

# Start built application (production mode)
pnpm electron:start

# Run tests
pnpm test

# Lint code
pnpm lint

# Type checking (for TypeScript)
pnpm type-check

# Clean build artifacts and cache
pnpm clean
```

### Why pnpm?

- **Faster installs**: Uses hard links and symlinks to reduce disk usage
- **Strict dependency resolution**: Prevents phantom dependencies
- **Better monorepo support**: Native workspace support
- **Disk efficient**: Global content-addressable storage

## Performance Requirements

- Application startup: ≤3 seconds
- Page transitions: ≤1 second
- Execution status updates: ≤500ms
- Real-time log display: ≤200ms

## Security Considerations

- Encrypt user credentials storage
- Implement data transmission encryption
- Log data sanitization (remove sensitive information)
- Implement proper access controls and permissions

## Key Development Notes

1. **Material Design Compliance**: UI should follow Material Design principles with Windows native styling references
2. **Cross-platform Support**: Ensure compatibility across macOS and Windows
3. **Process Management**: Implement robust start/pause/terminate controls for script execution
4. **Resource Monitoring**: Track CPU usage, memory consumption, and execution time
5. **Error Handling**: Comprehensive error handling with user-friendly messages
6. **Modular Design**: Maintain separation between authentication, dashboard, and execution modules

## Project Status

This project is currently in the planning phase (PRD completed). The actual implementation will follow the phases outlined in PRD.md:
- Phase 1: Basic Electron framework setup
- Phase 2: Core functionality development
- Phase 3: Feature completion and optimization
- Phase 4: Testing and deployment

When implementing, prioritize the login module first, followed by the main dashboard structure, then the script execution engine.