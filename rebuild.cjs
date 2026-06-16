const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const utilsDir = path.join(srcDir, 'utils');

function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const componentFiles = findFiles(componentsDir);
const utilFiles = findFiles(utilsDir);
const constantsFiles = findFiles(path.join(srcDir, 'constants'));
const hooksFiles = findFiles(path.join(srcDir, 'hooks'));

let allFiles = [...constantsFiles, ...utilFiles, ...hooksFiles, ...componentFiles];

let massiveString = `import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { RefreshCw, Activity, Target, MessageSquare, TrendingUp, Cpu, PieChart, Users, ChevronDown, Check, Zap, AlertCircle, Sparkles, Filter, Calendar, Folder, Settings, Shield, Link as LinkIcon, Database, Eye, Search, Plug, X } from 'lucide-react';
\n\n`;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  // strip all imports
  content = content.replace(/^import\s+.*?;?\s*$/gm, '');
  content = content.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');
  
  // strip exports
  content = content.replace(/^export\s+default\s+[a-zA-Z0-9_]+;?/gm, '');
  content = content.replace(/^export\s+/gm, '');
  
  massiveString += `// --- FILE: ${path.basename(file)} ---\n`;
  massiveString += content + '\n\n';
}

let mainApp = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf-8');
mainApp = mainApp.replace(/^import\s+.*?;?\s*$/gm, '');
mainApp = mainApp.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');
mainApp = mainApp.replace(/^export\s+default\s+App;?/gm, '');

massiveString += `// --- MAIN APP ---\n` + mainApp + `\nexport default App;\n`;

fs.writeFileSync(path.join(srcDir, 'App_massive.jsx'), massiveString);
console.log('Created App_massive.jsx with length:', massiveString.length);
