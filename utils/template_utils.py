"""
Template-Utilities für die Nachrichtenverarbeitung
"""

def select_template(message):
    """
    Wählt das passende Template basierend auf dem Nachrichteninhalt aus.
    """
    if not isinstance(message, dict):
        return 'default'

    # Überprüfe auf Panic-Button-Nachrichten
    if message.get('code') == 2030:
        return 'evalarm_panic'

    # Überprüfe auf Alarm-Nachrichten
    if message.get('code') in [2000, 2001, 2002]:
        return 'evalarm_alarm'

    # Standard-Template für unbekannte Nachrichten
    return 'default' 