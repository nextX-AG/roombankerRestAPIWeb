#!/usr/bin/env python3
"""
Flow Engine für die Ausführung von Nachrichtenverarbeitungs-Flows

Die Flow Engine führt Flows aus, die aus mehreren Steps bestehen:
- Filter: Prüft Bedingungen
- Transform: Wendet Templates an
- Forward: Leitet Nachrichten weiter
- Conditional: Bedingte Verzweigungen
"""

import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import json
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.message_normalizer import MessageNormalizer
from utils.filter_rules import FilterRuleEngine
from utils.normalized_template_engine import NormalizedTemplateEngine

logger = logging.getLogger(__name__)


class FlowResult:
    """Repräsentiert das Ergebnis einer Flow-Ausführung"""
    
    def __init__(self):
        self.success = False
        self.skipped = False
        self.error = None
        self.steps_executed = []
        self.output = None
        self.execution_time_ms = 0
        
    def mark_success(self, output=None):
        self.success = True
        self.output = output
        return self
        
    def mark_skipped(self, reason=None):
        self.skipped = True
        self.error = reason
        return self
        
    def mark_error(self, error):
        self.success = False
        self.error = str(error)
        return self
        
    def add_step_result(self, step_num: int, step_type: str, result: str, details: Dict = None):
        step_result = {
            "step": step_num,
            "type": step_type,
            "result": result
        }
        if details:
            step_result.update(details)
        self.steps_executed.append(step_result)
        
    def to_dict(self):
        return {
            "success": self.success,
            "skipped": self.skipped,
            "error": self.error,
            "steps_executed": self.steps_executed,
            "output": self.output,
            "execution_time_ms": self.execution_time_ms
        }


class FlowEngine:
    """Engine zur Ausführung von Flows"""
    
    def __init__(self, templates_dir=None):
        self.normalizer = MessageNormalizer()
        self.filter_engine = FilterRuleEngine()
        
        # Standardpfad für Templates bestimmen
        if templates_dir is None:
            templates_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'templates'
            )
        
        self.template_engine = NormalizedTemplateEngine(templates_dir)
        self._flow_cache = {}  # Cache für geladene Flows
        
    def execute_flow(self, flow: Dict, message: Dict, context: Dict = None) -> FlowResult:
        """
        Führt einen Flow mit der gegebenen Nachricht aus
        
        Args:
            flow: Flow-Definition (dict oder Flow-Objekt)
            message: Die zu verarbeitende Nachricht
            context: Optionaler Kontext (z.B. Gateway-Info, Customer-Info)
            
        Returns:
            FlowResult mit Ausführungsdetails
        """
        start_time = time.time()
        result = FlowResult()
        
        try:
            # Flow-Objekt in dict konvertieren falls nötig
            if hasattr(flow, 'to_dict'):
                flow_dict = flow.to_dict()
            else:
                flow_dict = flow
                
            # Nachricht normalisieren, falls noch nicht geschehen
            if 'gateway' not in message or 'devices' not in message:
                normalized = self.normalizer.normalize(message)
            else:
                normalized = message
                
            # Steps ausführen
            current_message = normalized
            for i, step in enumerate(flow_dict.get('steps', []), 1):
                step_result = self._execute_step(
                    step, 
                    current_message, 
                    context or {},
                    flow_dict.get('name', 'unknown')
                )
                
                # Step-Ergebnis zum Result hinzufügen
                result.add_step_result(
                    i,
                    step.get('type'),
                    step_result.get('status', 'unknown'),
                    step_result.get('details')
                )
                
                # Bei Filter-Fail: Flow beenden
                if step.get('type') == 'filter' and step_result.get('status') == 'failed':
                    result.mark_skipped("Filter conditions not met")
                    break
                    
                # Nachricht für nächsten Step aktualisieren
                if 'output' in step_result:
                    current_message = step_result['output']
                    
            else:
                # Alle Steps erfolgreich durchlaufen
                result.mark_success(current_message)
                
        except Exception as e:
            logger.error(f"Flow execution error: {str(e)}")
            result.mark_error(e)
            
        finally:
            result.execution_time_ms = int((time.time() - start_time) * 1000)
            
        return result
        
    def _execute_step(self, step: Dict, message: Dict, context: Dict, flow_name: str) -> Dict:
        """
        Führt einen einzelnen Flow-Step aus
        
        Returns:
            Dict mit status, details und optional output
        """
        step_type = step.get('type')
        config = step.get('config', {})
        
        try:
            if step_type == 'filter':
                return self._execute_filter_step(config, message)
                
            elif step_type == 'transform':
                return self._execute_transform_step(config, message, context)
                
            elif step_type == 'forward':
                return self._execute_forward_step(config, message, context)
                
            elif step_type == 'conditional':
                return self._execute_conditional_step(config, message, context)
                
            else:
                logger.warning(f"Unknown step type: {step_type}")
                return {
                    'status': 'skipped',
                    'details': {'reason': f'Unknown step type: {step_type}'}
                }
                
        except Exception as e:
            logger.error(f"Step execution error in {flow_name}: {str(e)}")
            return {
                'status': 'error',
                'details': {'error': str(e)}
            }
            
    def _execute_filter_step(self, config: Dict, message: Dict) -> Dict:
        """Führt einen Filter-Step aus"""
        rules = config.get('rules', [])
        
        if not rules:
            return {'status': 'passed', 'details': {'reason': 'No rules defined'}}
            
        # Regeln können als String-IDs oder als Regel-Definitionen angegeben werden
        for rule in rules:
            if isinstance(rule, str):
                # Regel-ID - aus Filter-Engine laden
                if not self.filter_engine.check_rule_by_id(rule, message):
                    return {
                        'status': 'failed',
                        'details': {'failed_rule': rule}
                    }
            elif isinstance(rule, dict):
                # Inline-Regel
                if not self._check_inline_rule(rule, message):
                    return {
                        'status': 'failed',
                        'details': {'failed_rule': rule}
                    }
                    
        return {'status': 'passed'}
        
    def _check_inline_rule(self, rule: Dict, message: Dict) -> bool:
        """Prüft eine inline definierte Regel"""
        field = rule.get('field')
        operator = rule.get('operator')
        value = rule.get('value')
        
        # Feld aus der Nachricht extrahieren
        field_value = self._get_field_value(message, field)
        
        # Operator anwenden
        if operator == 'equals':
            return field_value == value
        elif operator == 'not_equals':
            return field_value != value
        elif operator == 'greater_than':
            return float(field_value) > float(value)
        elif operator == 'less_than':
            return float(field_value) < float(value)
        elif operator == 'contains':
            return value in str(field_value)
        elif operator == 'in':
            return field_value in value
        else:
            logger.warning(f"Unknown operator: {operator}")
            return False
            
    def _get_field_value(self, message: Dict, field_path: str) -> Any:
        """Extrahiert einen Wert aus der Nachricht basierend auf dem Feldpfad"""
        parts = field_path.replace('[', '.').replace(']', '').split('.')
        value = message
        
        for part in parts:
            if part.isdigit():
                value = value[int(part)]
            else:
                value = value.get(part, None)
                
            if value is None:
                break
                
        return value
        
    def _execute_transform_step(self, config: Dict, message: Dict, context: Dict) -> Dict:
        """Führt einen Transform-Step aus"""
        template_id = config.get('template')
        
        if not template_id:
            return {
                'status': 'error',
                'details': {'error': 'No template specified'}
            }
            
        try:
            # Template anwenden
            result = self.template_engine.transform(message, template_id)
            
            return {
                'status': 'success',
                'output': result,
                'details': {'template': template_id}
            }
        except Exception as e:
            return {
                'status': 'error',
                'details': {'error': str(e), 'template': template_id}
            }
            
    def _execute_forward_step(self, config: Dict, message: Dict, context: Dict) -> Dict:
        """Führt einen Forward-Step aus (simuliert im Test-Modus)"""
        targets = config.get('targets', [])
        
        if not targets:
            return {
                'status': 'error',
                'details': {'error': 'No targets specified'}
            }
            
        # Im Test-Modus nur simulieren
        forwarded_to = []
        for target in targets:
            target_type = target.get('type')
            if target_type == 'evalarm':
                # Hier würde normalerweise die evAlarm-API aufgerufen
                forwarded_to.append('evalarm')
            elif target_type == 'log':
                # Logging
                level = target.get('level', 'info')
                logger.log(
                    getattr(logging, level.upper(), logging.INFO),
                    f"Flow forward: {json.dumps(message, indent=2)}"
                )
                forwarded_to.append(f'log:{level}')
            else:
                forwarded_to.append(target_type)
                
        return {
            'status': 'success',
            'details': {'forwarded_to': forwarded_to}
        }
        
    def _execute_conditional_step(self, config: Dict, message: Dict, context: Dict) -> Dict:
        """Führt einen Conditional-Step aus"""
        condition = config.get('condition')
        true_step = config.get('true_step')
        false_step = config.get('false_step')
        
        if not condition:
            return {
                'status': 'error',
                'details': {'error': 'No condition specified'}
            }
            
        # Condition evaluieren (vereinfachte Version)
        # TODO: Vollständige Expression-Evaluation implementieren
        condition_result = self._evaluate_condition(condition, message)
        
        # Entsprechenden Step ausführen
        next_step = true_step if condition_result else false_step
        
        if next_step:
            return self._execute_step(next_step, message, context, "conditional")
        else:
            return {
                'status': 'success',
                'details': {'condition_result': condition_result}
            }
            
    def _evaluate_condition(self, condition: str, message: Dict) -> bool:
        """Evaluiert eine Bedingung (vereinfachte Version)"""
        # TODO: Vollständige Expression-Evaluation mit sicherer Sandbox
        # Für jetzt nur einfache Vergleiche
        
        if '==' in condition:
            parts = condition.split('==')
            if len(parts) == 2:
                left = self._get_field_value(message, parts[0].strip())
                right = parts[1].strip().strip("'\"")
                return str(left) == right
                
        return False
        
    def validate_flow(self, flow: Dict) -> Tuple[bool, List[str]]:
        """
        Validiert eine Flow-Definition
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # Pflichtfelder prüfen
        if not flow.get('name'):
            errors.append("Flow name is required")
            
        if not flow.get('flow_type') in ['gateway_flow', 'device_flow']:
            errors.append("Flow type must be 'gateway_flow' or 'device_flow'")
            
        # Steps validieren
        steps = flow.get('steps', [])
        if not steps:
            errors.append("Flow must have at least one step")
            
        for i, step in enumerate(steps):
            if not step.get('type'):
                errors.append(f"Step {i+1}: type is required")
                
            if step.get('type') not in ['filter', 'transform', 'forward', 'conditional']:
                errors.append(f"Step {i+1}: invalid type '{step.get('type')}'")
                
        return len(errors) == 0, errors


# Singleton-Instanz wird bei Bedarf erstellt
# flow_engine = FlowEngine() 