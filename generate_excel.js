import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Framework Data
const frameworkData = [
    { Area: 'Backend', Technology: 'Java', Version: '21', Type: 'Language' },
    { Area: 'Backend', Technology: 'Spring Boot', Version: '4.1.0', Type: 'Framework' },
    { Area: 'Backend', Technology: 'Maven', Version: 'Latest', Type: 'Build Tool' },
    { Area: 'Frontend', Technology: 'JavaScript (ES Modules)', Version: 'ES6+', Type: 'Language' },
    { Area: 'Frontend', Technology: 'React', Version: '18.2.0', Type: 'Framework' },
    { Area: 'Frontend', Technology: 'Vite', Version: '5.1.4', Type: 'Bundler / Dev Server' }
];

// Backend Data
const backendData = [
    { Dependency: 'spring-boot-starter-web', Version: '4.1.0', Purpose: 'Powers the RESTful API endpoints, routing, and embedded Tomcat server.' },
    { Dependency: 'spring-boot-starter-data-jpa', Version: '4.1.0', Purpose: 'Provides Hibernate ORM and automatic database schema generation (DDL).' },
    { Dependency: 'spring-boot-starter-jdbc', Version: '4.1.0', Purpose: 'Provides JdbcTemplate for executing dynamic, high-performance SQL queries.' },
    { Dependency: 'postgresql', Version: '(managed)', Purpose: 'PostgreSQL JDBC Driver for connecting to the primary Postgres database.' },
    { Dependency: 'lombok', Version: '(managed)', Purpose: 'Reduces Java boilerplate code (getters, setters, constructors).' }
];

// Frontend Data
const frontendData = [
    { Dependency: 'react / react-dom', Version: '^18.2.0', Purpose: 'Core React library for building responsive user interfaces.' },
    { Dependency: 'react-router-dom', Version: '^6.22.0', Purpose: 'Handles client-side routing (e.g., navigating to /reports and /discovery).' },
    { Dependency: 'axios', Version: '^1.18.1', Purpose: 'HTTP client used for making requests to the Spring Boot backend.' },
    { Dependency: 'lucide-react', Version: '^0.344.0', Purpose: 'Provides the crisp, modern SVG iconography used throughout the application.' },
    { Dependency: 'xlsx', Version: '^0.18.5', Purpose: 'Used for generating Excel spreadsheet exports directly in the browser.' },
    { Dependency: 'papaparse', Version: '^5.4.1', Purpose: 'Extremely fast CSV parser for handling bulk data imports/exports.' },
    { Dependency: 'jspdf', Version: '^2.5.1', Purpose: 'Core library for generating PDF reports client-side.' },
    { Dependency: 'jspdf-autotable', Version: '^3.8.2', Purpose: 'Plugin for jspdf used to beautifully render data grids into PDFs.' }
];

// Create a new workbook
const wb = XLSX.utils.book_new();

// Add Framework sheet
const wsFramework = XLSX.utils.json_to_sheet(frameworkData);
XLSX.utils.book_append_sheet(wb, wsFramework, 'Framework');

// Add Backend sheet
const wsBackend = XLSX.utils.json_to_sheet(backendData);
XLSX.utils.book_append_sheet(wb, wsBackend, 'Backend (Java)');

// Add Frontend sheet
const wsFrontend = XLSX.utils.json_to_sheet(frontendData);
XLSX.utils.book_append_sheet(wb, wsFrontend, 'Frontend (React)');

// Auto-size columns (rudimentary)
wsFramework['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
wsBackend['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 80 }];
wsFrontend['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 80 }];

// Write to file
const outputPath = path.join('..', '..', 'Technology_Stack.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`Successfully generated ${outputPath}`);
