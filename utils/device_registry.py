"""
Central Device Registry - Single Source of Truth for Device Definitions

This module contains all device type definitions, message codes, and related
functionality for device discovery and management. It replaces the scattered
hard-coded device type definitions throughout the codebase.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Central device type definitions
DEVICE_TYPES = {
    "panic_button": {
        "name": "Panic Button",
        "description": "Emergency button for alarm situations",
        "codes": [2030],
        "identifying_fields": ["alarmtype", "alarmstatus"],
        "required_fields": ["alarmtype", "alarmstatus"],
        "optional_fields": ["batterystatus", "onlinestatus"],
        "value_mappings": {
            "alarmtype": ["panic", "none"],
            "alarmstatus": ["alarm", "normal"],
            "batterystatus": ["connected", "low", "critical"],
            "onlinestatus": ["online", "offline"]
        },
        "mqtt_topics": ["alarm/panic", "device/status/panic_button"],
        "default_template": "evalarm_panic",
        "priority": "high",
        "icon": "alert-triangle"
    },
    "temperature_humidity_sensor": {
        "name": "Temperature & Humidity Sensor",
        "description": "Environmental sensor for temperature and humidity monitoring",
        "codes": [2001, 2002],
        "identifying_fields": ["temperature", "humidity"],
        "required_fields": ["temperature", "humidity"],
        "optional_fields": ["batterylevel", "batterystatus", "onlinestatus"],
        "value_ranges": {
            "temperature": {"min": -40, "max": 80, "unit": "°C"},
            "humidity": {"min": 0, "max": 100, "unit": "%"},
            "batterylevel": {"min": 0, "max": 100, "unit": "%"}
        },
        "mqtt_topics": ["telemetry/environment", "sensor/temperature", "sensor/humidity"],
        "default_template": "evalarm_status",
        "priority": "normal",
        "icon": "thermometer"
    },
    "door_window_sensor": {
        "name": "Door/Window Sensor",
        "description": "Contact sensor for doors and windows",
        "codes": [2010, 2011],
        "identifying_fields": ["contactstate", "open", "closed"],
        "required_fields": ["contactstate"],
        "optional_fields": ["batterystatus", "tamper", "onlinestatus"],
        "value_mappings": {
            "contactstate": ["open", "closed"],
            "tamper": ["normal", "triggered"],
            "batterystatus": ["connected", "low", "critical"]
        },
        "mqtt_topics": ["security/contact", "device/status/contact_sensor"],
        "default_template": "evalarm_status",
        "priority": "normal",
        "icon": "door-open"
    },
    "motion_sensor": {
        "name": "Motion Sensor",
        "description": "PIR motion detection sensor",
        "codes": [2020, 2021],
        "identifying_fields": ["motion", "motiondetected"],
        "required_fields": ["motion"],
        "optional_fields": ["batterystatus", "sensitivity", "onlinestatus"],
        "value_mappings": {
            "motion": ["detected", "clear"],
            "sensitivity": ["low", "medium", "high"],
            "batterystatus": ["connected", "low", "critical"]
        },
        "mqtt_topics": ["security/motion", "device/status/motion_sensor"],
        "default_template": "evalarm_status",
        "priority": "normal",
        "icon": "activity"
    },
    "smoke_detector": {
        "name": "Smoke Detector",
        "description": "Smoke and fire detection sensor",
        "codes": [2040, 2041],
        "identifying_fields": ["smoke", "smokedetected"],
        "required_fields": ["smoke"],
        "optional_fields": ["batterystatus", "temperature", "test_mode"],
        "value_mappings": {
            "smoke": ["alarm", "normal"],
            "test_mode": ["active", "inactive"],
            "batterystatus": ["connected", "low", "critical"]
        },
        "mqtt_topics": ["alarm/smoke", "device/status/smoke_detector"],
        "default_template": "evalarm_alarm",
        "priority": "high",
        "icon": "flame"
    },
    "security_sensor": {
        "name": "Generic Security Sensor",
        "description": "Generic security sensor with alarm status",
        "codes": [2000],
        "identifying_fields": ["alarmstatus"],
        "required_fields": ["alarmstatus"],
        "optional_fields": ["alarmtype", "batterystatus", "onlinestatus"],
        "value_mappings": {
            "alarmstatus": ["alarm", "normal"],
            "batterystatus": ["connected", "low", "critical"],
            "onlinestatus": ["online", "offline"]
        },
        "mqtt_topics": ["security/generic", "device/status/security_sensor"],
        "default_template": "evalarm_status",
        "priority": "normal",
        "icon": "shield"
    },
    "unknown": {
        "name": "Unknown Device",
        "description": "Unrecognized device type",
        "codes": [],
        "identifying_fields": [],
        "required_fields": [],
        "optional_fields": [],
        "value_mappings": {},
        "mqtt_topics": ["device/unknown"],
        "default_template": "evalarm_status",
        "priority": "low",
        "icon": "help-circle"
    }
}

# Message code definitions
MESSAGE_CODES = {
    2000: {
        "name": "Generic Status",
        "description": "Generic status message from security devices",
        "typical_devices": ["security_sensor"],
        "priority": "normal"
    },
    2001: {
        "name": "Environmental Status",
        "description": "Regular status message from environmental sensors",
        "typical_devices": ["temperature_humidity_sensor"],
        "priority": "normal"
    },
    2002: {
        "name": "Environmental Alert",
        "description": "Alert from environmental sensors (threshold exceeded)",
        "typical_devices": ["temperature_humidity_sensor"],
        "priority": "high"
    },
    2010: {
        "name": "Contact Status",
        "description": "Status update from contact sensors",
        "typical_devices": ["door_window_sensor"],
        "priority": "normal"
    },
    2011: {
        "name": "Contact Alert",
        "description": "Alert from contact sensors (unauthorized access)",
        "typical_devices": ["door_window_sensor"],
        "priority": "high"
    },
    2020: {
        "name": "Motion Status",
        "description": "Status update from motion sensors",
        "typical_devices": ["motion_sensor"],
        "priority": "normal"
    },
    2021: {
        "name": "Motion Alert",
        "description": "Motion detected alert",
        "typical_devices": ["motion_sensor"],
        "priority": "high"
    },
    2030: {
        "name": "Panic Alarm",
        "description": "Emergency alarm from panic button",
        "typical_devices": ["panic_button"],
        "priority": "critical"
    },
    2040: {
        "name": "Smoke Status",
        "description": "Status update from smoke detector",
        "typical_devices": ["smoke_detector"],
        "priority": "normal"
    },
    2041: {
        "name": "Smoke Alarm",
        "description": "Smoke/fire detected alarm",
        "typical_devices": ["smoke_detector"],
        "priority": "critical"
    }
}


class DeviceRegistry:
    """Central registry for device type management"""
    
    def __init__(self):
        self.device_types = DEVICE_TYPES.copy()
        self.message_codes = MESSAGE_CODES.copy()
        self._custom_devices = {}
        
    def detect_device_type(self, message_data: Dict[str, Any]) -> str:
        """
        Detect device type from message data using unified logic
        
        Args:
            message_data: Message data containing device information
            
        Returns:
            Device type identifier
        """
        # Extract values from different message formats
        values = self._extract_values(message_data)
        
        if not values:
            logger.warning("No values found in message data")
            return "unknown"
        
        # Check each device type's identifying fields
        for device_type, config in self.device_types.items():
            if device_type == "unknown":
                continue
                
            # Check if any identifying field is present
            for field in config.get("identifying_fields", []):
                if field in values:
                    # Additional validation for specific types
                    if device_type == "panic_button":
                        if values.get("alarmtype") == "panic":
                            return device_type
                    elif device_type == "temperature_humidity_sensor":
                        # Must have both temperature and humidity
                        if "temperature" in values and "humidity" in values:
                            return device_type
                        # Also check for alternative field names
                        elif "currenttemperature" in values and "currenthumidity" in values:
                            return device_type
                    else:
                        # For other types, presence of identifying field is enough
                        return device_type
            
            # Special handling for temperature_humidity_sensor with alternative field names
            if device_type == "temperature_humidity_sensor":
                # Check for alternative field names even if main identifying fields are not present
                if "currenttemperature" in values and "currenthumidity" in values:
                    return device_type
                # Also check for single alternative fields combined
                if ("currenttemperature" in values or "temperature" in values) and \
                   ("currenthumidity" in values or "humidity" in values):
                    return device_type
        
        # Check message code as fallback
        code = message_data.get("code")
        if code and code in self.message_codes:
            typical_devices = self.message_codes[code].get("typical_devices", [])
            if typical_devices:
                return typical_devices[0]
        
        return "unknown"
    
    def _extract_values(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract device values from various message formats"""
        values = {}
        
        # Handle subdevicelist format (priority)
        if "subdevicelist" in message_data and isinstance(message_data["subdevicelist"], list):
            if len(message_data["subdevicelist"]) > 0:
                first_device = message_data["subdevicelist"][0]
                if isinstance(first_device, dict):
                    # Extract from value/values field in subdevice
                    if "value" in first_device and isinstance(first_device["value"], dict):
                        values.update(first_device["value"])
                    elif "values" in first_device and isinstance(first_device["values"], dict):
                        values.update(first_device["values"])
                    # Also check direct fields in subdevice
                    for key, value in first_device.items():
                        if key not in ["id", "value", "values"] and isinstance(value, (str, int, float, bool)):
                            values[key] = value
        
        # Direct values in message
        elif isinstance(message_data, dict):
            # Check for value/values field
            if "value" in message_data and isinstance(message_data["value"], dict):
                values.update(message_data["value"])
            elif "values" in message_data and isinstance(message_data["values"], dict):
                values.update(message_data["values"])
            
            # Check for direct fields
            for key, value in message_data.items():
                if key not in ["id", "code", "ts", "gateway_id", "subdevicelist", "value", "values"] and isinstance(value, (str, int, float, bool)):
                    values[key] = value
        
        return values
    
    def get_device_capabilities(self, device_type: str) -> Optional[Dict[str, Any]]:
        """Get capabilities and configuration for a device type"""
        return self.device_types.get(device_type)
    
    def validate_device_message(self, device_type: str, message: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate a message against device type requirements
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        config = self.device_types.get(device_type)
        
        if not config:
            return False, [f"Unknown device type: {device_type}"]
        
        values = self._extract_values(message)
        
        # Check required fields
        for field in config.get("required_fields", []):
            if field not in values:
                errors.append(f"Missing required field: {field}")
        
        # Validate value ranges
        value_ranges = config.get("value_ranges", {})
        for field, range_config in value_ranges.items():
            if field in values:
                value = values[field]
                try:
                    numeric_value = float(value)
                    if "min" in range_config and numeric_value < range_config["min"]:
                        errors.append(f"{field} value {numeric_value} below minimum {range_config['min']}")
                    if "max" in range_config and numeric_value > range_config["max"]:
                        errors.append(f"{field} value {numeric_value} above maximum {range_config['max']}")
                except (ValueError, TypeError):
                    errors.append(f"{field} value '{value}' is not numeric")
        
        # Validate value mappings (enums)
        value_mappings = config.get("value_mappings", {})
        for field, allowed_values in value_mappings.items():
            if field in values and values[field] not in allowed_values:
                errors.append(f"{field} value '{values[field]}' not in allowed values: {allowed_values}")
        
        return len(errors) == 0, errors
    
    def get_suitable_templates(self, device_type: str) -> List[str]:
        """Get list of suitable templates for a device type"""
        config = self.device_types.get(device_type, {})
        templates = [config.get("default_template", "evalarm_status")]
        
        # Add type-specific alternatives
        if device_type == "panic_button":
            templates.extend(["evalarm_panic", "evalarm_panic_v2"])
        elif device_type in ["temperature_humidity_sensor", "door_window_sensor", "motion_sensor"]:
            templates.extend(["evalarm_status", "evalarm_sensor"])
        elif device_type == "smoke_detector":
            templates.extend(["evalarm_alarm", "evalarm_critical"])
        
        return list(set(templates))  # Remove duplicates
    
    def get_mqtt_topics(self, gateway_id: str, device_type: str, device_id: str) -> Dict[str, str]:
        """Generate MQTT topics for a device"""
        config = self.device_types.get(device_type, {})
        base_topics = config.get("mqtt_topics", ["device/unknown"])
        
        return {
            "telemetry": f"gateways/{gateway_id}/devices/{device_id}/telemetry",
            "status": f"gateways/{gateway_id}/devices/{device_id}/status",
            "command": f"gateways/{gateway_id}/devices/{device_id}/command",
            "config": f"gateways/{gateway_id}/devices/{device_id}/config",
            # Legacy topics for compatibility
            "legacy": base_topics
        }
    
    def add_custom_device_type(self, device_type_id: str, config: Dict[str, Any]) -> bool:
        """Add a custom device type at runtime"""
        if device_type_id in self.device_types:
            logger.warning(f"Device type {device_type_id} already exists")
            return False
        
        # Validate required fields
        required = ["name", "description", "identifying_fields", "required_fields"]
        for field in required:
            if field not in config:
                logger.error(f"Missing required field {field} in custom device config")
                return False
        
        self.device_types[device_type_id] = config
        self._custom_devices[device_type_id] = config
        logger.info(f"Added custom device type: {device_type_id}")
        return True
    
    def get_message_code_info(self, code: int) -> Optional[Dict[str, Any]]:
        """Get information about a message code"""
        return self.message_codes.get(code)
    
    def get_all_device_types(self) -> Dict[str, Dict[str, Any]]:
        """Get all registered device types"""
        return self.device_types.copy()
    
    def get_all_message_codes(self) -> Dict[int, Dict[str, Any]]:
        """Get all message codes"""
        return self.message_codes.copy()


# Global registry instance
device_registry = DeviceRegistry()

# Convenience functions for backward compatibility
def detect_device_type(message_data: Dict[str, Any]) -> str:
    """Global function for device type detection"""
    return device_registry.detect_device_type(message_data)

def get_device_capabilities(device_type: str) -> Optional[Dict[str, Any]]:
    """Global function to get device capabilities"""
    return device_registry.get_device_capabilities(device_type)

def validate_device_message(device_type: str, message: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Global function for message validation"""
    return device_registry.validate_device_message(device_type, message)

def get_suitable_templates(device_type: str) -> List[str]:
    """Global function to get suitable templates"""
    return device_registry.get_suitable_templates(device_type) 