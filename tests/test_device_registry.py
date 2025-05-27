"""
Test script for the central Device Registry

This script tests the new unified device type detection and validates
that all components use the same device type definitions.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.device_registry import device_registry
from utils.message_normalizer import MessageNormalizer
from api.models import determine_device_type

def test_panic_button_detection():
    """Test panic button detection across different message formats"""
    print("\n=== Testing Panic Button Detection ===")
    
    # Test Case 1: Standard panic button message
    panic_message_1 = {
        "code": 2030,
        "subdeviceid": 673922542395461,
        "alarmstatus": "alarm",
        "alarmtype": "panic",
        "ts": 1747344697
    }
    
    # Test Case 2: Panic button in subdevicelist format
    panic_message_2 = {
        "subdevicelist": [{
            "id": 673922542395461,
            "value": {
                "alarmstatus": "alarm",
                "alarmtype": "panic",
                "batterystatus": "connected",
                "onlinestatus": "online"
            }
        }]
    }
    
    # Test with device registry
    type1 = device_registry.detect_device_type(panic_message_1)
    type2 = device_registry.detect_device_type(panic_message_2)
    
    # Test with models.py function (should use registry internally)
    type3 = determine_device_type({"alarmtype": "panic", "alarmstatus": "alarm"})
    
    # Test with message normalizer
    normalizer = MessageNormalizer()
    normalized = normalizer._normalize_roombanker_panic(panic_message_1, "test-gateway")
    if normalized["devices"]:
        type4 = normalizer._determine_device_type(normalized["devices"][0])
    else:
        type4 = "unknown"
    
    print(f"Registry direct (message 1): {type1}")
    print(f"Registry direct (message 2): {type2}")
    print(f"Models.py determine_device_type: {type3}")
    print(f"Message normalizer: {type4}")
    
    assert type1 == "panic_button", f"Expected 'panic_button', got '{type1}'"
    assert type2 == "panic_button", f"Expected 'panic_button', got '{type2}'"
    assert type3 == "panic_button", f"Expected 'panic_button', got '{type3}'"
    assert type4 == "panic_button", f"Expected 'panic_button', got '{type4}'"
    
    print("✓ All panic button tests passed!")

def test_temperature_sensor_detection():
    """Test temperature sensor detection"""
    print("\n=== Testing Temperature Sensor Detection ===")
    
    # Test Case 1: Standard format
    temp_message_1 = {
        "subdevicelist": [{
            "id": 1000019,
            "value": {
                "temperature": 25,
                "humidity": 63,
                "batterylevel": 93,
                "batterystatus": "connected",
                "onlinestatus": "online"
            }
        }]
    }
    
    # Test Case 2: Alternative field names
    temp_message_2 = {
        "id": 1000019,
        "value": {
            "currenttemperature": 25,
            "currenthumidity": 63
        }
    }
    
    # Test with registry
    type1 = device_registry.detect_device_type(temp_message_1)
    type2 = device_registry.detect_device_type(temp_message_2)
    
    # Test with models.py (old format with currenttemperature)
    type3 = determine_device_type({"currenttemperature": 25, "currenthumidity": 63})
    
    print(f"Registry (standard format): {type1}")
    print(f"Registry (alternative fields): {type2}")
    print(f"Models.py: {type3}")
    
    # Note: The registry now uses 'temperature_humidity_sensor' consistently
    assert type1 == "temperature_humidity_sensor", f"Expected 'temperature_humidity_sensor', got '{type1}'"
    assert type2 == "temperature_humidity_sensor", f"Expected 'temperature_humidity_sensor', got '{type2}'"
    assert type3 == "temperature_humidity_sensor", f"Expected 'temperature_humidity_sensor', got '{type3}'"
    
    print("✓ All temperature sensor tests passed!")

def test_message_validation():
    """Test message validation against device requirements"""
    print("\n=== Testing Message Validation ===")
    
    # Valid panic button message
    valid_panic = {
        "value": {
            "alarmtype": "panic",
            "alarmstatus": "alarm",
            "batterystatus": "connected"
        }
    }
    
    # Invalid panic button message (missing required field)
    invalid_panic = {
        "value": {
            "alarmtype": "panic"
            # Missing alarmstatus
        }
    }
    
    # Validate messages
    is_valid1, errors1 = device_registry.validate_device_message("panic_button", valid_panic)
    is_valid2, errors2 = device_registry.validate_device_message("panic_button", invalid_panic)
    
    print(f"Valid panic message: {is_valid1} (errors: {errors1})")
    print(f"Invalid panic message: {is_valid2} (errors: {errors2})")
    
    assert is_valid1 == True, "Valid message should pass validation"
    assert is_valid2 == False, "Invalid message should fail validation"
    assert "Missing required field: alarmstatus" in errors2
    
    print("✓ Message validation tests passed!")

def test_template_suggestions():
    """Test template suggestions for device types"""
    print("\n=== Testing Template Suggestions ===")
    
    templates_panic = device_registry.get_suitable_templates("panic_button")
    templates_temp = device_registry.get_suitable_templates("temperature_humidity_sensor")
    templates_unknown = device_registry.get_suitable_templates("unknown")
    
    print(f"Panic button templates: {templates_panic}")
    print(f"Temperature sensor templates: {templates_temp}")
    print(f"Unknown device templates: {templates_unknown}")
    
    assert "evalarm_panic" in templates_panic
    assert "evalarm_status" in templates_temp
    assert "evalarm_status" in templates_unknown
    
    print("✓ Template suggestion tests passed!")

def test_mqtt_topics():
    """Test MQTT topic generation"""
    print("\n=== Testing MQTT Topic Generation ===")
    
    topics = device_registry.get_mqtt_topics("gateway-123", "panic_button", "device-456")
    
    print("Generated MQTT topics:")
    for topic_type, topic in topics.items():
        print(f"  {topic_type}: {topic}")
    
    assert topics["telemetry"] == "gateways/gateway-123/devices/device-456/telemetry"
    assert topics["command"] == "gateways/gateway-123/devices/device-456/command"
    assert "alarm/panic" in topics["legacy"]
    
    print("✓ MQTT topic tests passed!")

def test_message_codes():
    """Test message code information"""
    print("\n=== Testing Message Code Information ===")
    
    code_2030 = device_registry.get_message_code_info(2030)
    code_2001 = device_registry.get_message_code_info(2001)
    
    print(f"Code 2030: {code_2030}")
    print(f"Code 2001: {code_2001}")
    
    assert code_2030["name"] == "Panic Alarm"
    assert code_2001["name"] == "Environmental Status"
    assert "panic_button" in code_2030["typical_devices"]
    
    print("✓ Message code tests passed!")

def main():
    """Run all tests"""
    print("Starting Device Registry Tests...")
    
    try:
        test_panic_button_detection()
        test_temperature_sensor_detection()
        test_message_validation()
        test_template_suggestions()
        test_mqtt_topics()
        test_message_codes()
        
        print("\n✅ All tests passed! The central Device Registry is working correctly.")
        
        # Show summary
        print("\n=== Device Registry Summary ===")
        all_devices = device_registry.get_all_device_types()
        print(f"Total device types registered: {len(all_devices)}")
        for device_type, config in all_devices.items():
            print(f"  - {device_type}: {config['name']}")
        
        all_codes = device_registry.get_all_message_codes()
        print(f"\nTotal message codes registered: {len(all_codes)}")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 