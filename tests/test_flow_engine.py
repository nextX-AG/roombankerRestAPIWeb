#!/usr/bin/env python3
"""
Tests für die Flow Engine
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.flow_engine import FlowEngine, FlowResult
import json


def test_simple_flow():
    """Test eines einfachen Flows mit Filter, Transform und Forward"""
    
    print("=== Testing Simple Flow ===\n")
    
    # Flow-Definition
    flow = {
        "name": "panic_alarm_flow",
        "flow_type": "device_flow",
        "version": "1.0.0",
        "steps": [
            {
                "type": "filter",
                "config": {
                    "rules": [
                        {
                            "field": "devices[0].values.alarmtype",
                            "operator": "equals",
                            "value": "panic"
                        }
                    ]
                }
            },
            {
                "type": "transform",
                "config": {
                    "template": "evalarm_panic"
                }
            },
            {
                "type": "forward",
                "config": {
                    "targets": [
                        {"type": "evalarm"},
                        {"type": "log", "level": "info"}
                    ]
                }
            }
        ]
    }
    
    # Test-Nachricht (bereits normalisiert)
    test_message = {
        "gateway": {
            "id": "gw-test-123",
            "type": "roombanker_gateway"
        },
        "devices": [
            {
                "id": "12345",
                "type": "panic_button",
                "values": {
                    "alarmtype": "panic",
                    "alarmstatus": "alarm",
                    "batterystatus": "connected"
                }
            }
        ]
    }
    
    # Flow ausführen
    engine = FlowEngine()
    result = engine.execute_flow(flow, test_message)
    
    # Ergebnisse ausgeben
    print(f"Flow executed successfully: {result.success}")
    print(f"Execution time: {result.execution_time_ms}ms")
    print(f"\nSteps executed:")
    for step in result.steps_executed:
        print(f"  Step {step['step']} ({step['type']}): {step['result']}")
        if 'details' in step:
            print(f"    Details: {json.dumps(step['details'], indent=6)}")
    
    if result.output:
        print(f"\nFinal output:")
        print(json.dumps(result.output, indent=2))
    
    assert result.success is True
    assert len(result.steps_executed) == 3
    assert result.steps_executed[0]['result'] == 'passed'  # Filter passed
    
    print("\n✅ Simple flow test passed!\n")


def test_filter_fail():
    """Test eines Flows, bei dem der Filter nicht erfüllt wird"""
    
    print("=== Testing Flow with Failed Filter ===\n")
    
    # Flow-Definition
    flow = {
        "name": "temperature_alert_flow",
        "flow_type": "device_flow",
        "version": "1.0.0",
        "steps": [
            {
                "type": "filter",
                "config": {
                    "rules": [
                        {
                            "field": "devices[0].values.temperature",
                            "operator": "greater_than",
                            "value": 30
                        }
                    ]
                }
            },
            {
                "type": "transform",
                "config": {
                    "template": "evalarm_temperature"
                }
            }
        ]
    }
    
    # Test-Nachricht mit niedriger Temperatur
    test_message = {
        "gateway": {
            "id": "gw-test-456",
            "type": "roombanker_gateway"
        },
        "devices": [
            {
                "id": "67890",
                "type": "temperature_humidity_sensor",
                "values": {
                    "temperature": 22.5,  # Unter dem Schwellenwert
                    "humidity": 45
                }
            }
        ]
    }
    
    # Flow ausführen
    engine = FlowEngine()
    result = engine.execute_flow(flow, test_message)
    
    # Ergebnisse ausgeben
    print(f"Flow skipped: {result.skipped}")
    print(f"Reason: {result.error}")
    print(f"\nSteps executed:")
    for step in result.steps_executed:
        print(f"  Step {step['step']} ({step['type']}): {step['result']}")
    
    assert result.skipped is True
    assert result.error == "Filter conditions not met"
    assert len(result.steps_executed) == 1
    assert result.steps_executed[0]['result'] == 'failed'
    
    print("\n✅ Filter fail test passed!\n")


def test_conditional_flow():
    """Test eines Flows mit bedingter Verzweigung"""
    
    print("=== Testing Conditional Flow ===\n")
    
    # Flow-Definition mit Conditional
    flow = {
        "name": "battery_check_flow",
        "flow_type": "device_flow",
        "version": "1.0.0",
        "steps": [
            {
                "type": "conditional",
                "config": {
                    "condition": "devices[0].values.batterystatus == 'low'",
                    "true_step": {
                        "type": "transform",
                        "config": {
                            "template": "evalarm_battery_low"
                        }
                    },
                    "false_step": {
                        "type": "transform",
                        "config": {
                            "template": "evalarm_status"
                        }
                    }
                }
            }
        ]
    }
    
    # Test mit niedrigem Batteriestand
    test_message_low = {
        "gateway": {
            "id": "gw-test-789",
            "type": "roombanker_gateway"
        },
        "devices": [
            {
                "id": "11111",
                "type": "panic_button",
                "values": {
                    "batterystatus": "low",
                    "alarmstatus": "normal"
                }
            }
        ]
    }
    
    # Flow ausführen
    engine = FlowEngine()
    result = engine.execute_flow(flow, test_message_low)
    
    print(f"Conditional flow executed: {result.success}")
    print(f"\nSteps executed:")
    for step in result.steps_executed:
        print(f"  Step {step['step']} ({step['type']}): {step['result']}")
        if 'details' in step:
            print(f"    Details: {json.dumps(step['details'], indent=6)}")
    
    assert result.success is True
    
    print("\n✅ Conditional flow test passed!\n")


def test_flow_validation():
    """Test der Flow-Validierung"""
    
    print("=== Testing Flow Validation ===\n")
    
    engine = FlowEngine()
    
    # Gültiger Flow
    valid_flow = {
        "name": "test_flow",
        "flow_type": "device_flow",
        "steps": [
            {"type": "filter", "config": {}}
        ]
    }
    
    is_valid, errors = engine.validate_flow(valid_flow)
    print(f"Valid flow validation: {is_valid}")
    assert is_valid is True
    
    # Ungültiger Flow (ohne Name)
    invalid_flow1 = {
        "flow_type": "device_flow",
        "steps": [{"type": "filter"}]
    }
    
    is_valid, errors = engine.validate_flow(invalid_flow1)
    print(f"\nInvalid flow (no name) validation: {is_valid}")
    print(f"Errors: {errors}")
    assert is_valid is False
    assert "Flow name is required" in errors
    
    # Ungültiger Flow (ohne Steps)
    invalid_flow2 = {
        "name": "test",
        "flow_type": "gateway_flow",
        "steps": []
    }
    
    is_valid, errors = engine.validate_flow(invalid_flow2)
    print(f"\nInvalid flow (no steps) validation: {is_valid}")
    print(f"Errors: {errors}")
    assert is_valid is False
    assert "Flow must have at least one step" in errors
    
    print("\n✅ Flow validation test passed!\n")


if __name__ == "__main__":
    test_simple_flow()
    test_filter_fail()
    test_conditional_flow()
    test_flow_validation()
    
    print("\n🎉 All Flow Engine tests passed!") 