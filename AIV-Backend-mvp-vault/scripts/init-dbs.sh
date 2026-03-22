#!/bin/bash
# Create the ALCM database alongside the platform database
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE alcm_db OWNER aiv;
EOSQL
