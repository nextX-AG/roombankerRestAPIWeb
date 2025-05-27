"""
Tests für die Integration der Flow Engine in den Message Processor
"""
import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Flow, FlowGroup, Gateway, Device
from utils.flow_selector import select_flow_for_message
from utils.flow_engine import FlowEngine


def test_flow_integration():
    """Test der kompletten Flow-Integration"""
    # Erstelle einen Test-Flow
    flow = Flow.create(
        name="test_integration_flow",
        type="device_flow",
        description="Test Flow für Integration",
        steps=[
            {
                "type": "filter",
                "config": {
                    "rules": [{
                        "field": "devices[0].values.alarmtype",
                        "operator": "equals",
                        "value": "panic"
                    }]
                }
            },
            {
                "type": "transform",
                "config": {
                    "template": {
                        "alarm": "panic button pressed",
                        "device": "{{ devices[0].device_id }}",
                        "timestamp": "{{ timestamp }}"
                    }
                }
            }
        ]
    )
    
    # Erstelle eine Test-Flow-Gruppe
    flow_group = FlowGroup.create(
        name="Test Integration Group",
        type="device_flows",
        flows=[{
            "flow_id": str(flow._id),
            "flow_name": flow.name,
            "priority": 100
        }]
    )
    
    # Test-Nachricht
    test_message = {
        "devices": [{
            "device_id": "test_device_123",
            "values": {
                "alarmtype": "panic",
                "alarmstatus": "alarm"
            }
        }],
        "timestamp": "2024-01-01T12:00:00Z"
    }
    
    # Teste Flow-Auswahl (ohne Gateway-Zuordnung)
    selected_flow_id = select_flow_for_message("test_gateway", test_message)
    print(f"Selected flow ID: {selected_flow_id}")
    
    # Teste Flow-Ausführung
    engine = FlowEngine()
    result = engine.execute_flow(str(flow._id), test_message)
    
    assert result.success
    assert result.transformed_message["alarm"] == "panic button pressed"
    assert result.transformed_message["device"] == "test_device_123"
    
    # Cleanup
    flow.delete()
    flow_group.delete()
    
    print("✅ Flow-Integration funktioniert!")


if __name__ == "__main__":
    test_flow_integration() 