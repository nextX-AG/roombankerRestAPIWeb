#!/bin/bash

# Starte den Auth Service
echo "Starte Auth Service..."
cd "$(dirname "$0")"
python3 auth_service.py
