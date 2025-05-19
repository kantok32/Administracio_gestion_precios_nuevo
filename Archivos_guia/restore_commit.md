# Restaurar a un Commit Específico

## Commit a Restaurar
SHA: `b90fd3c4b8646266f947326a03beeb03a080b4c7`

## Instrucciones para Restaurar

1. Primero, asegúrate de que no hay cambios sin commitear que quieras guardar:
```bash
git status
```

2. Si hay cambios que quieres guardar, haz un commit o un stash:
```bash
git stash
```

3. Limpia los node_modules para evitar conflictos:
```bash
# En Windows (PowerShell)
Remove-Item -Recurse -Force frontend/node_modules
# En Linux/Mac
rm -rf frontend/node_modules
```

4. Restaura al commit específico:
```bash
git reset --hard b90fd3c4b8646266f947326a03beeb03a080b4c7 
```

5. Reinstala las dependencias:
```bash
cd frontend
npm install
```

## Notas Importantes
- Este proceso descartará todos los commits posteriores al SHA especificado
- Asegúrate de tener un backup o una rama con tus cambios actuales si es necesario
- Si tienes problemas con archivos bloqueados, cierra el editor y cualquier proceso que pueda estar usando los archivos

## Para Verificar
Después de la restauración, puedes verificar que estás en el commit correcto con:
```bash
git log -1
``` 