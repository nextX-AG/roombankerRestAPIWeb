class Template:
    # ... existing Template class code ...

class TemplateGroup:
    """Template-Gruppen für verschiedene Gerätetypen"""
    
    def __init__(self):
        self.collection = get_db()['template_groups']
        
    def create(self, data):
        """Erstelle eine neue Template-Gruppe"""
        template_group = {
            'id': str(uuid.uuid4()),
            'name': data.get('name', 'Neue Template-Gruppe'),
            'description': data.get('description', ''),
            'templates': data.get('templates', []),  # [{template_id, priority}, ...]
            'usage_count': 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = self.collection.insert_one(template_group)
        if result.inserted_id:
            return template_group
        return None
    
    def get(self, group_id):
        """Hole eine Template-Gruppe anhand der ID"""
        return self.collection.find_one({'id': group_id})
    
    def get_all(self):
        """Hole alle Template-Gruppen"""
        return list(self.collection.find({}, {'_id': 0}).sort('created_at', -1))
    
    def update(self, group_id, data):
        """Aktualisiere eine Template-Gruppe"""
        data['updated_at'] = datetime.utcnow()
        
        # Entferne id aus den Update-Daten
        if 'id' in data:
            del data['id']
            
        result = self.collection.update_one(
            {'id': group_id},
            {'$set': data}
        )
        
        if result.modified_count > 0:
            return self.get(group_id)
        return None
    
    def delete(self, group_id):
        """Lösche eine Template-Gruppe"""
        result = self.collection.delete_one({'id': group_id})
        return result.deleted_count > 0
    
    def increment_usage(self, group_id):
        """Erhöhe den Verwendungszähler"""
        self.collection.update_one(
            {'id': group_id},
            {'$inc': {'usage_count': 1}}
        ) 