#!/bin/bash

# Create simple colored square icons for testing
# In production, you'd use proper icon files

# Create SVG icons first
cat > icon.svg << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#3b82f6"/>
  <text x="64" y="70" font-family="Arial" font-size="24" fill="white" text-anchor="middle">AI</text>
</svg>
EOF

# Convert to different sizes (requires ImageMagick or similar)
# For now, just copy the SVG
cp icon.svg icon-16.svg
cp icon.svg icon-48.svg  
cp icon.svg icon-128.svg

echo "Icon placeholders created. In production, convert these to PNG files." 