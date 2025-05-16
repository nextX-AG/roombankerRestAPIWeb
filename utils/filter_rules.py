"""
Filter Rules - Komponente des Nachrichtenverarbeitungssystems

Diese Komponente definiert und verarbeitet Filterregeln für die Nachrichtenverarbeitung.
Filterregeln bestimmen, ob eine normalisierte Nachricht weitergeleitet werden soll oder nicht.
"""

import json
import logging
import re
from typing import Dict, List, Any, Optional, Union, Callable

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('filter-rules')

class FilterRule:
    """
    Basisklasse für Filterregeln.
    
    Eine Filterregel überprüft einen bestimmten Aspekt einer normalisierten Nachricht
    und entscheidet, ob die Nachricht weitergeleitet werden soll oder nicht.
    """
    
    def __init__(self, name: str, description: str = None):
        """
        Initialisiert die Filterregel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            description: Optionale Beschreibung der Regel
        """
        self.name = name
        self.description = description or f"Filter: {name}"
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob die Nachricht der Filterregel entspricht.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn die Nachricht der Regel entspricht, sonst False
        """
        # Standardimplementierung in Unterklassen überschreiben
        raise NotImplementedError("Diese Methode muss in Unterklassen implementiert werden")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        return {
            "name": self.name,
            "description": self.description,
            "type": self.__class__.__name__
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FilterRule':
        """
        Erstellt eine Filterregel aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine Instanz der entsprechenden Filterregelklasse
        """
        rule_type = data.get("type", "")
        
        # Wähle die entsprechende Unterklasse basierend auf dem Typ
        if rule_type == "ValueComparisonRule":
            return ValueComparisonRule.from_dict(data)
        elif rule_type == "RangeRule":
            return RangeRule.from_dict(data)
        elif rule_type == "RegexRule":
            return RegexRule.from_dict(data)
        elif rule_type == "ListContainsRule":
            return ListContainsRule.from_dict(data)
        elif rule_type == "AndRule":
            return AndRule.from_dict(data)
        elif rule_type == "OrRule":
            return OrRule.from_dict(data)
        else:
            raise ValueError(f"Unbekannter Regeltyp: {rule_type}")


class ValueComparisonRule(FilterRule):
    """
    Regel, die den Wert eines Felds mit einem bestimmten Wert vergleicht.
    """
    
    def __init__(self, name: str, field_path: str, expected_value: Any, 
                 description: str = None, negate: bool = False):
        """
        Initialisiert die Wertevergleichsregel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            field_path: Der Pfad zum Feld in der normalisierten Nachricht (z.B. "gateway.id" oder "devices[0].values.temperature")
            expected_value: Der erwartete Wert
            description: Optionale Beschreibung der Regel
            negate: Ob der Vergleich negiert werden soll (True = Übereinstimmung, wenn ungleich)
        """
        super().__init__(name, description)
        self.field_path = field_path
        self.expected_value = expected_value
        self.negate = negate
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob der Wert des angegebenen Felds mit dem erwarteten Wert übereinstimmt.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn der Wert übereinstimmt (oder nicht übereinstimmt, falls negate=True)
        """
        actual_value = self._get_field_value(normalized_message, self.field_path)
        
        if actual_value is None:
            # Wenn das Feld nicht existiert, gilt die Regel als nicht erfüllt
            return False if not self.negate else True
        
        result = actual_value == self.expected_value
        return result if not self.negate else not result
    
    def _get_field_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """
        Extrahiert den Wert eines Felds basierend auf einem Pfad.
        
        Args:
            data: Die Daten, aus denen der Wert extrahiert werden soll
            field_path: Der Pfad zum Feld (z.B. "gateway.id" oder "devices[0].values.temperature")
            
        Returns:
            Der Wert des Felds oder None, wenn das Feld nicht existiert
        """
        try:
            # Array-Notation verarbeiten (z.B. devices[0])
            array_match = re.search(r'(\w+)\[(\d+)\]', field_path)
            if array_match:
                array_name = array_match.group(1)
                index = int(array_match.group(2))
                
                # Prüfen, ob es ein weiterer Pfad nach dem Array gibt
                remaining_path = field_path[field_path.find(']') + 1:]
                if remaining_path.startswith('.'):
                    remaining_path = remaining_path[1:]  # Führenden Punkt entfernen
                
                # Array-Element extrahieren
                if array_name in data and isinstance(data[array_name], list) and len(data[array_name]) > index:
                    if remaining_path:
                        # Rekursiv den restlichen Pfad verarbeiten
                        return self._get_field_value(data[array_name][index], remaining_path)
                    else:
                        # Das Array-Element selbst ist das Ziel
                        return data[array_name][index]
                return None
            
            # Punkt-Notation verarbeiten (z.B. gateway.id)
            if '.' in field_path:
                parts = field_path.split('.', 1)
                if parts[0] in data:
                    if isinstance(data[parts[0]], (dict, list)):
                        return self._get_field_value(data[parts[0]], parts[1])
                    else:
                        # Wenn der erste Teil kein Dict ist, kann es keinen weiteren Pfad geben
                        return None
                return None
            
            # Einfaches Feld
            return data.get(field_path)
        except Exception as e:
            logger.warning(f"Fehler beim Extrahieren des Feldwerts für {field_path}: {str(e)}")
            return None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict.update({
            "field_path": self.field_path,
            "expected_value": self.expected_value,
            "negate": self.negate
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValueComparisonRule':
        """
        Erstellt eine ValueComparisonRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine ValueComparisonRule-Instanz
        """
        return cls(
            name=data.get("name", "unnamed_value_rule"),
            field_path=data.get("field_path", ""),
            expected_value=data.get("expected_value"),
            description=data.get("description"),
            negate=data.get("negate", False)
        )


class RangeRule(FilterRule):
    """
    Regel, die überprüft, ob ein Zahlenwert innerhalb eines bestimmten Bereichs liegt.
    """
    
    def __init__(self, name: str, field_path: str, min_value: Optional[Union[int, float]] = None, 
                 max_value: Optional[Union[int, float]] = None, inclusive: bool = True,
                 description: str = None, negate: bool = False):
        """
        Initialisiert die Bereichsregel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            field_path: Der Pfad zum Feld in der normalisierten Nachricht
            min_value: Der Mindestwert (None = kein Mindestwert)
            max_value: Der Maximalwert (None = kein Maximalwert)
            inclusive: Ob die Grenzen einschließlich sind
            description: Optionale Beschreibung der Regel
            negate: Ob der Bereichsvergleich negiert werden soll
        """
        super().__init__(name, description)
        self.field_path = field_path
        self.min_value = min_value
        self.max_value = max_value
        self.inclusive = inclusive
        self.negate = negate
        
        # Mindestens ein Grenzwert muss gesetzt sein
        if min_value is None and max_value is None:
            raise ValueError("Mindestens min_value oder max_value muss gesetzt sein")
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob der Wert des angegebenen Felds im definierten Bereich liegt.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn der Wert im Bereich liegt (oder nicht, falls negate=True)
        """
        # Hilfsfunktion für Feldwertextraktion wiederverwenden
        value_rule = ValueComparisonRule("temp", self.field_path, None)
        actual_value = value_rule._get_field_value(normalized_message, self.field_path)
        
        if actual_value is None:
            # Wenn das Feld nicht existiert, gilt die Regel als nicht erfüllt
            return False if not self.negate else True
        
        try:
            # Versuche, den Wert in eine Zahl zu konvertieren
            numeric_value = float(actual_value)
            
            # Bereichsprüfung
            in_range = True
            
            if self.min_value is not None:
                if self.inclusive:
                    in_range = in_range and numeric_value >= self.min_value
                else:
                    in_range = in_range and numeric_value > self.min_value
            
            if self.max_value is not None:
                if self.inclusive:
                    in_range = in_range and numeric_value <= self.max_value
                else:
                    in_range = in_range and numeric_value < self.max_value
            
            return in_range if not self.negate else not in_range
        except (ValueError, TypeError):
            # Bei Konvertierungsfehler gilt die Regel als nicht erfüllt
            logger.warning(f"Wert {actual_value} für Feld {self.field_path} konnte nicht in eine Zahl konvertiert werden")
            return False if not self.negate else True
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict.update({
            "field_path": self.field_path,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "inclusive": self.inclusive,
            "negate": self.negate
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RangeRule':
        """
        Erstellt eine RangeRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine RangeRule-Instanz
        """
        return cls(
            name=data.get("name", "unnamed_range_rule"),
            field_path=data.get("field_path", ""),
            min_value=data.get("min_value"),
            max_value=data.get("max_value"),
            inclusive=data.get("inclusive", True),
            description=data.get("description"),
            negate=data.get("negate", False)
        )


class RegexRule(FilterRule):
    """
    Regel, die überprüft, ob ein Textwert einem regulären Ausdruck entspricht.
    """
    
    def __init__(self, name: str, field_path: str, pattern: str, 
                 description: str = None, negate: bool = False):
        """
        Initialisiert die Regex-Regel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            field_path: Der Pfad zum Feld in der normalisierten Nachricht
            pattern: Das Regex-Muster als String
            description: Optionale Beschreibung der Regel
            negate: Ob der Regex-Vergleich negiert werden soll
        """
        super().__init__(name, description)
        self.field_path = field_path
        self.pattern = pattern
        self.negate = negate
        
        # Kompiliere den regulären Ausdruck
        try:
            self.regex = re.compile(pattern)
        except re.error as e:
            raise ValueError(f"Ungültiges Regex-Muster: {pattern} - {str(e)}")
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob der Wert des angegebenen Felds dem Regex-Muster entspricht.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn der Wert dem Muster entspricht (oder nicht, falls negate=True)
        """
        # Hilfsfunktion für Feldwertextraktion wiederverwenden
        value_rule = ValueComparisonRule("temp", self.field_path, None)
        actual_value = value_rule._get_field_value(normalized_message, self.field_path)
        
        if actual_value is None:
            # Wenn das Feld nicht existiert, gilt die Regel als nicht erfüllt
            return False if not self.negate else True
        
        # Konvertiere zu String, falls nötig
        str_value = str(actual_value)
        
        # Führe Regex-Vergleich durch
        matches = bool(self.regex.search(str_value))
        return matches if not self.negate else not matches
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict.update({
            "field_path": self.field_path,
            "pattern": self.pattern,
            "negate": self.negate
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RegexRule':
        """
        Erstellt eine RegexRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine RegexRule-Instanz
        """
        return cls(
            name=data.get("name", "unnamed_regex_rule"),
            field_path=data.get("field_path", ""),
            pattern=data.get("pattern", ".*"),
            description=data.get("description"),
            negate=data.get("negate", False)
        )


class ListContainsRule(FilterRule):
    """
    Regel, die überprüft, ob ein Wert in einer Liste enthalten ist.
    """
    
    def __init__(self, name: str, field_path: str, allowed_values: List[Any], 
                 description: str = None, negate: bool = False):
        """
        Initialisiert die Listen-Enthält-Regel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            field_path: Der Pfad zum Feld in der normalisierten Nachricht
            allowed_values: Die Liste der erlaubten Werte
            description: Optionale Beschreibung der Regel
            negate: Ob der Listenvergleich negiert werden soll
        """
        super().__init__(name, description)
        self.field_path = field_path
        self.allowed_values = allowed_values
        self.negate = negate
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob der Wert des angegebenen Felds in der erlaubten Liste enthalten ist.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn der Wert in der Liste enthalten ist (oder nicht, falls negate=True)
        """
        # Hilfsfunktion für Feldwertextraktion wiederverwenden
        value_rule = ValueComparisonRule("temp", self.field_path, None)
        actual_value = value_rule._get_field_value(normalized_message, self.field_path)
        
        if actual_value is None:
            # Wenn das Feld nicht existiert, gilt die Regel als nicht erfüllt
            return False if not self.negate else True
        
        # Prüfe, ob der Wert in der Liste enthalten ist
        in_list = actual_value in self.allowed_values
        return in_list if not self.negate else not in_list
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict.update({
            "field_path": self.field_path,
            "allowed_values": self.allowed_values,
            "negate": self.negate
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ListContainsRule':
        """
        Erstellt eine ListContainsRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine ListContainsRule-Instanz
        """
        return cls(
            name=data.get("name", "unnamed_list_rule"),
            field_path=data.get("field_path", ""),
            allowed_values=data.get("allowed_values", []),
            description=data.get("description"),
            negate=data.get("negate", False)
        )


class AndRule(FilterRule):
    """
    Regel, die mehrere Unterregeln mit AND verknüpft.
    """
    
    def __init__(self, name: str, rules: List[FilterRule], description: str = None):
        """
        Initialisiert die AND-Regel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            rules: Die Liste der Unterregeln
            description: Optionale Beschreibung der Regel
        """
        super().__init__(name, description)
        self.rules = rules
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob alle Unterregeln erfüllt sind.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn alle Unterregeln erfüllt sind
        """
        return all(rule.matches(normalized_message) for rule in self.rules)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict["rules"] = [rule.to_dict() for rule in self.rules]
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AndRule':
        """
        Erstellt eine AndRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine AndRule-Instanz
        """
        rules = []
        for rule_data in data.get("rules", []):
            rules.append(FilterRule.from_dict(rule_data))
        
        return cls(
            name=data.get("name", "unnamed_and_rule"),
            rules=rules,
            description=data.get("description")
        )


class OrRule(FilterRule):
    """
    Regel, die mehrere Unterregeln mit OR verknüpft.
    """
    
    def __init__(self, name: str, rules: List[FilterRule], description: str = None):
        """
        Initialisiert die OR-Regel.
        
        Args:
            name: Ein eindeutiger Name für die Regel
            rules: Die Liste der Unterregeln
            description: Optionale Beschreibung der Regel
        """
        super().__init__(name, description)
        self.rules = rules
    
    def matches(self, normalized_message: Dict[str, Any]) -> bool:
        """
        Überprüft, ob mindestens eine Unterregel erfüllt ist.
        
        Args:
            normalized_message: Die normalisierte Nachricht
            
        Returns:
            True, wenn mindestens eine Unterregel erfüllt ist
        """
        return any(rule.matches(normalized_message) for rule in self.rules)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Konvertiert die Regel in ein Dictionary zur Serialisierung.
        
        Returns:
            Ein Dictionary, das diese Regel repräsentiert
        """
        rule_dict = super().to_dict()
        rule_dict["rules"] = [rule.to_dict() for rule in self.rules]
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OrRule':
        """
        Erstellt eine OrRule aus einem Dictionary.
        
        Args:
            data: Ein Dictionary mit Regeldaten
            
        Returns:
            Eine OrRule-Instanz
        """
        rules = []
        for rule_data in data.get("rules", []):
            rules.append(FilterRule.from_dict(rule_data))
        
        return cls(
            name=data.get("name", "unnamed_or_rule"),
            rules=rules,
            description=data.get("description")
        )


class FilterRuleEngine:
    """
    Engine zur Verwaltung und Anwendung von Filterregeln auf normalisierte Nachrichten.
    """
    
    def __init__(self):
        """Initialisiert die Filter-Engine"""
        self.rules = {}
    
    def add_rule(self, rule: FilterRule):
        """
        Fügt eine Regel zur Engine hinzu
        
        Args:
            rule: Die hinzuzufügende Regel
        """
        self.rules[rule.name] = rule
    
    def has_rule(self, rule_name: str) -> bool:
        """
        Prüft, ob eine Regel mit dem angegebenen Namen existiert
        
        Args:
            rule_name: Name der Regel
            
        Returns:
            True, wenn die Regel existiert, sonst False
        """
        return rule_name in self.rules
    
    def get_rule(self, rule_name: str) -> Optional[FilterRule]:
        """
        Holt eine Regel anhand ihres Namens
        
        Args:
            rule_name: Name der Regel
            
        Returns:
            Die Regel oder None, wenn sie nicht existiert
        """
        return self.rules.get(rule_name)
    
    def get_rule_names(self) -> List[str]:
        """
        Gibt die Namen aller registrierten Regeln zurück
        
        Returns:
            Liste der Regelnamen
        """
        return list(self.rules.keys())
    
    def should_forward(self, message: Dict[str, Any], rule_names: Optional[List[str]] = None) -> bool:
        """
        Prüft, ob eine Nachricht basierend auf den angegebenen Regeln weitergeleitet werden soll
        
        Args:
            message: Die zu prüfende normalisierte Nachricht
            rule_names: Liste der anzuwendenden Regelnamen (optional, wenn nicht angegeben, werden alle Regeln angewendet)
            
        Returns:
            True, wenn die Nachricht weitergeleitet werden soll, sonst False
        """
        # Wenn keine Regeln angegeben sind, alle anwenden
        rules_to_check = []
        
        if rule_names:
            # Nur die angegebenen Regeln anwenden
            for name in rule_names:
                if name in self.rules:
                    rules_to_check.append(self.rules[name])
                else:
                    logger.warning(f"Regel '{name}' nicht gefunden, wird übersprungen")
        else:
            # Alle Regeln anwenden
            rules_to_check = list(self.rules.values())
        
        # Wenn keine Regeln zu prüfen sind, immer weiterleiten
        if not rules_to_check:
            logger.info("Keine Regeln zu prüfen, leite weiter")
            return True
        
        # Prüfe, ob mindestens eine Regel erfüllt ist
        matching_rules = []
        
        for rule in rules_to_check:
            if rule.matches(message):
                matching_rules.append(rule.name)
        
        # Wenn wir hier sind und mindestens eine Regel erfüllt ist, weiterleiten
        return len(matching_rules) > 0
    
    def get_matching_rules(self, message: Dict[str, Any]) -> List[str]:
        """
        Gibt alle Regeln zurück, die auf die Nachricht zutreffen
        
        Args:
            message: Die zu prüfende normalisierte Nachricht
            
        Returns:
            Liste der Namen der zutreffenden Regeln
        """
        matching_rules = []
        
        for rule_name, rule in self.rules.items():
            if rule.matches(message):
                matching_rules.append(rule_name)
        
        return matching_rules
    
    def save_rules_to_file(self, file_path: str) -> None:
        """
        Speichert alle definierten Regeln in einer JSON-Datei.
        
        Args:
            file_path: Der Pfad zur Zieldatei
        """
        rules_dict = {name: rule.to_dict() for name, rule in self.rules.items()}
        with open(file_path, 'w') as f:
            json.dump(rules_dict, f, indent=2)
    
    def load_rules_from_file(self, file_path: str) -> None:
        """
        Lädt Regeln aus einer JSON-Datei.
        
        Args:
            file_path: Der Pfad zur Quelldatei
        """
        with open(file_path, 'r') as f:
            rules_dict = json.load(f)
        
        self.rules = {}
        for name, rule_data in rules_dict.items():
            self.add_rule(FilterRule.from_dict(rule_data))


# Beispiel für die Verwendung des Filterregel-Systems
if __name__ == "__main__":
    # Beispiel-normalisierte Nachricht
    normalized_message = {
        "gateway": {
            "id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
            "type": "roombanker_gateway",
            "metadata": {
                "timestamp": 1747344697,
                "last_seen": "2023-05-25T14:31:37"
            }
        },
        "devices": [
            {
                "id": "673922542395461",
                "type": "panic_button",
                "values": {
                    "alarmstatus": "alarm",
                    "alarmtype": "panic",
                    "batterystatus": "connected",
                    "onlinestatus": "online"
                },
                "last_seen": "2023-05-25T14:31:37"
            }
        ]
    }
    
    # Filter-Engine erstellen
    engine = FilterRuleEngine()
    
    # Beispiel-Regeln hinzufügen
    
    # 1. Regel: Panic-Button-Alarm-Regel
    panic_rule = ValueComparisonRule(
        name="panic_alarm",
        field_path="devices[0].values.alarmtype",
        expected_value="panic",
        description="Filtert Panic-Button-Alarme"
    )
    engine.add_rule(panic_rule)
    
    # 2. Regel: Batteriestand-Regel
    battery_rule = ValueComparisonRule(
        name="battery_connected",
        field_path="devices[0].values.batterystatus",
        expected_value="connected",
        description="Filtert Geräte mit angeschlossener Batterie"
    )
    engine.add_rule(battery_rule)
    
    # 3. Regel: Gateway-ID-Regel
    gateway_rule = RegexRule(
        name="gateway_pattern",
        field_path="gateway.id",
        pattern="^gw-.*",
        description="Filtert Gateway-IDs, die mit 'gw-' beginnen"
    )
    engine.add_rule(gateway_rule)
    
    # 4. Kombinierte Regel: Panik UND Batterie
    combined_rule = AndRule(
        name="panic_with_battery",
        rules=[panic_rule, battery_rule],
        description="Filtert Panic-Button-Alarme mit angeschlossener Batterie"
    )
    engine.add_rule(combined_rule)
    
    # Nachricht prüfen
    if engine.should_forward(normalized_message):
        print(f"Nachricht sollte weitergeleitet werden")
    else:
        print(f"Nachricht sollte NICHT weitergeleitet werden")
    
    # Zutreffende Regeln anzeigen
    matching_rules = engine.get_matching_rules(normalized_message)
    print(f"Zutreffende Regeln: {matching_rules}") 