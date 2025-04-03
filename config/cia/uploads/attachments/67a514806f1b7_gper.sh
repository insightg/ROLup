# Vai nella directory principale dell'app
cd /var/www/html/insightg/wup

# Imposta i permessi dei file a 640 (solo server e proprietario)
find . -type f -exec chmod 770 {} \;

# Imposta i permessi delle directory a 750
find . -type d -exec chmod 770 {} \;

# Consenti l'accesso pubblico solo al file index.php
chmod 664 index.php

# Assicurati che il server web sia proprietario dei file e delle directory
chown -R www-data:www-data /var/www/html/insightg/wup

