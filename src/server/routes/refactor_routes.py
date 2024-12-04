import os
import re

def refactor_route_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove express import
    content = re.sub(r'import\s+express\s+from\s+[\'"]express[\'"];?\n', '', content)
    
    # Remove LoggingManager import if not used elsewhere
    content = re.sub(r'import\s+\{\s*LoggingManager\s*\}\s+from\s+[\'"].*LoggingManager[\'"];?\n', '', content)
    
    # Replace router creation
    content = re.sub(r'export\s+const\s+router\s*=\s*(express\.Router\(\)|Router\(\));', 'export const router = createRouter();', content)
    
    # Add routeUtils import
    if 'import { createRouter' not in content:
        content = f"import {{ createRouter, logRouteAccess }} from '../routeUtils';\n{content}"
    
    # Replace LoggingManager calls with logRouteAccess
    content = re.sub(r'LoggingManager\.getInstance\(\)\.info\(', 'logRouteAccess(', content)
    content = re.sub(r'LoggingManager\.getInstance\(\)\.error\(', 'logRouteAccess(', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

def main():
    routes_dir = r'c:/Users/jmaga/code/dash/src/server/routes'
    
    for root, dirs, files in os.walk(routes_dir):
        for file in files:
            if file == 'routes.ts':
                full_path = os.path.join(root, file)
                print(f"Refactoring {full_path}")
                refactor_route_file(full_path)

if __name__ == '__main__':
    main()
