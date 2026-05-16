CREATE DATABASE IF NOT EXISTS eve_killboard;
CREATE USER IF NOT EXISTS 'eve_user'@'localhost' IDENTIFIED BY 'eve_password';
GRANT ALL PRIVILEGES ON eve_killboard.* TO 'eve_user'@'localhost';
FLUSH PRIVILEGES;