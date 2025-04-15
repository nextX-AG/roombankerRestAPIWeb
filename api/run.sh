#!/bin/bash

# Starte den IoT Gateway API Server
echo "Starte IoT Gateway API Server..."
cd "$(dirname "$0")"
python3 app.py
