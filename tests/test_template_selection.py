#!/usr/bin/env python3
"""
Test für Template Selection mit Device Registry Integration
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.template_selector import select_template_for_message, _fallback_template_selection
from utils.device_registry import device_registry

def test_template_selection_with_device_registry():
    """Test, ob die Template-Auswahl die Device Registry nutzt"""
    
    print("=== Testing Template Selection with Device Registry ===\n")
    
    # Test 1: Panic Button Message
    panic_message = {
        "gatewayUuid": "gw-test-123",
        "subdevicelist": [{
            "id": "12345",
            "value": {
                "alarmtype": "panic",
                "alarmstatus": "alarm",
                "batterystatus": "connected"
            }
        }]
    }
    
    template = _fallback_template_selection(panic_message)
    print(f"Test 1 - Panic Button:")
    print(f"  Message: {panic_message}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: evalarm_panic")
    print(f"  ✓ PASS" if template == "evalarm_panic" else f"  ✗ FAIL")
    print()
    
    # Test 2: Temperature Sensor Message
    temp_message = {
        "gatewayUuid": "gw-test-123",
        "subdevicelist": [{
            "id": "67890",
            "value": {
                "temperature": 22.5,
                "humidity": 60,
                "batterylevel": 85
            }
        }]
    }
    
    template = _fallback_template_selection(temp_message)
    print(f"Test 2 - Temperature Sensor:")
    print(f"  Message: {temp_message}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: evalarm_status")
    print(f"  ✓ PASS" if template == "evalarm_status" else f"  ✗ FAIL")
    print()
    
    # Test 3: Message with Code
    code_message = {
        "gatewayUuid": "gw-test-123",
        "code": 2030,  # Panic code
        "subdeviceid": 12345,
        "alarmtype": "panic"
    }
    
    template = _fallback_template_selection(code_message)
    print(f"Test 3 - Message with Code 2030:")
    print(f"  Message: {code_message}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: evalarm_panic")
    print(f"  ✓ PASS" if template == "evalarm_panic" else f"  ✗ FAIL")
    print()
    
    # Test 4: Door Sensor Message
    door_message = {
        "gatewayUuid": "gw-test-123",
        "subdevicelist": [{
            "id": "11111",
            "value": {
                "contactstate": "open",
                "batterystatus": "connected"
            }
        }]
    }
    
    template = _fallback_template_selection(door_message)
    print(f"Test 4 - Door Sensor:")
    print(f"  Message: {door_message}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: evalarm_status")
    print(f"  ✓ PASS" if template == "evalarm_status" else f"  ✗ FAIL")
    print()
    
    # Test 5: Unknown Device
    unknown_message = {
        "gatewayUuid": "gw-test-123",
        "subdevicelist": [{
            "id": "99999",
            "value": {
                "unknownfield": "value"
            }
        }]
    }
    
    template = _fallback_template_selection(unknown_message)
    print(f"Test 5 - Unknown Device:")
    print(f"  Message: {unknown_message}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: evalarm_status (fallback)")
    print(f"  ✓ PASS" if template == "evalarm_status" else f"  ✗ FAIL")
    print()
    
    # Test 6: Mit Gateway-Objekt (simuliert)
    class MockGateway:
        def __init__(self):
            self.uuid = "gw-test-123"
            self.template_id = "custom_template"
    
    gateway = MockGateway()
    template = select_template_for_message(gateway, panic_message)
    print(f"Test 6 - With Gateway Object:")
    print(f"  Gateway template_id: {gateway.template_id}")
    print(f"  Selected Template: {template}")
    print(f"  Expected: custom_template")
    print(f"  ✓ PASS" if template == "custom_template" else f"  ✗ FAIL")
    print()

def test_device_registry_templates():
    """Überprüfe, ob alle Device Types ein default_template haben"""
    
    print("=== Device Registry Template Check ===\n")
    
    for device_type, config in device_registry.device_types.items():
        default_template = config.get('default_template', 'MISSING')
        print(f"{device_type}:")
        print(f"  Default Template: {default_template}")
        print(f"  ✓ OK" if default_template != 'MISSING' else f"  ✗ MISSING TEMPLATE!")
    
    print()

if __name__ == "__main__":
    test_device_registry_templates()
    test_template_selection_with_device_registry()
    print("\nAll tests completed!") 