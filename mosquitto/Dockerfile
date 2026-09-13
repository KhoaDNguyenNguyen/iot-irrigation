FROM eclipse-mosquitto:latest
COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY acl /mosquitto/config/acl
RUN touch /mosquitto/config/passwd && \
    mosquitto_passwd -b /mosquitto/config/passwd backend backend123 && \
    mosquitto_passwd -b /mosquitto/config/passwd esp32 esp32pass
