

#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_NeoPixel.h>


const char* WIFI_SSID     = "A55 korisnika Davor";
const char* WIFI_PASSWORD = "DavorWifi";
const char* MQTT_BROKER   = "10.233.217.226";
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "mqtt_user";
const char* MQTT_PASS     = "mqtt_user";

const char* TOPIC_DOOR             = "beesmart/koshnica1/poklopac";
const char* TOPIC_TEMP_OUT         = "beesmart/koshnica1/temperatura";
const char* TOPIC_HUM_OUT          = "beesmart/koshnica1/vlaga";
const char* TOPIC_WEIGHT_OUT       = "beesmart/koshnica1/tezina";
const char* TOPIC_HUMIDIFIER_STATE = "beesmart/koshnica1/humidifier/state";


const char* TOPIC_FEED_TEMP   = "beesmart/koshnica1/feed/temperatura";
const char* TOPIC_FEED_HUM    = "beesmart/koshnica1/feed/vlaga";
const char* TOPIC_FEED_WEIGHT = "beesmart/koshnica1/feed/tezina";


const char* TOPIC_LED            = "beesmart/koshnica1/led/set";
const char* TOPIC_HUMIDIFIER_SET = "beesmart/koshnica1/humidifier/set";


const int SENSOR_PIN     = 3;   // Magnetni senzor (door)
const int LED_PIN        = 8;   // Ugrađeni NeoPixel RGB
const int LED_COUNT      = 1;
const int HUMIDIFIER_PIN = 4;   // Relay za humidifier


const bool RELAY_ACTIVE_LOW = true;


int lastDoorState      = -1;
bool humidifierState   = false;  // false = OFF

WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

void setLED(uint8_t r, uint8_t g, uint8_t b) {
  strip.setPixelColor(0, strip.Color(r, g, b));
  strip.show();
}

void ledOff()   { setLED(0, 0, 0); }
void ledRed()   { setLED(255, 0, 0); }
void ledGreen() { setLED(0, 255, 0); }
void ledBlue()  { setLED(0, 0, 255); }

void setHumidifier(bool turnOn) {
  humidifierState = turnOn;
  digitalWrite(HUMIDIFIER_PIN, (RELAY_ACTIVE_LOW ? !turnOn : turnOn) ? HIGH : LOW);
  mqtt.publish(TOPIC_HUMIDIFIER_STATE, turnOn ? "ON" : "OFF", true);
  Serial.print("[HUMIDIFIER] ");
  Serial.println(turnOn ? "Uključen ✓" : "Isključen ✗");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("[MQTT IN] ");
  Serial.print(topic);
  Serial.print(" → ");
  Serial.println(message);

  if (String(topic) == TOPIC_FEED_TEMP) {
    mqtt.publish(TOPIC_TEMP_OUT, message.c_str());
    Serial.print("[RELAY] Temperatura proslijeđena HA-u: ");
    Serial.println(message);
    return;
  }
  if (String(topic) == TOPIC_FEED_HUM) {
    mqtt.publish(TOPIC_HUM_OUT, message.c_str());
    Serial.print("[RELAY] Vlaga proslijeđena HA-u: ");
    Serial.println(message);
    return;
  }
  if (String(topic) == TOPIC_FEED_WEIGHT) {
    mqtt.publish(TOPIC_WEIGHT_OUT, message.c_str());
    Serial.print("[RELAY] Težina proslijeđena HA-u: ");
    Serial.println(message);
    return;
  }

  if (String(topic) == TOPIC_LED) {
    if (message == "RED") {
      ledRed();
      Serial.println("[LED] Crvena – košnica otvorena!");
    } else if (message == "GREEN") {
      ledGreen();
      Serial.println("[LED] Zelena");
    } else if (message == "BLUE") {
      ledBlue();
      Serial.println("[LED] Plava");
    } else if (message == "OFF") {
      ledOff();
      Serial.println("[LED] Ugašena");
    }
  }

  if (String(topic) == TOPIC_HUMIDIFIER_SET) {
    if      (message == "ON")  setHumidifier(true);
    else if (message == "OFF") setHumidifier(false);
  }
}

void connectWiFi() {
  Serial.print("[WiFi] Spajanje na ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Spojeno! IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);

  while (!mqtt.connected()) {
    Serial.print("[MQTT] Spajanje...");
    if (mqtt.connect("ESP32-BeeSmart-K1", MQTT_USER, MQTT_PASS)) {
      Serial.println(" spojeno!");

      mqtt.subscribe(TOPIC_FEED_TEMP);
      mqtt.subscribe(TOPIC_FEED_HUM);
      mqtt.subscribe(TOPIC_FEED_WEIGHT);

      mqtt.subscribe(TOPIC_LED);
      mqtt.subscribe(TOPIC_HUMIDIFIER_SET);
      Serial.println("[MQTT] Pretplaćen na: feed topici + LED + Humidifier");

      mqtt.publish(TOPIC_HUMIDIFIER_STATE, "OFF", true);
    } else {
      Serial.print(" greška rc=");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);


  pinMode(SENSOR_PIN, INPUT_PULLUP);
  pinMode(HUMIDIFIER_PIN, OUTPUT);

  digitalWrite(HUMIDIFIER_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);


  strip.begin();
  strip.setBrightness(50);
  ledOff();

  Serial.println("\n=============================");
  Serial.println(" BeeSmart – Košnica 1 (v2)");
  Serial.println("=============================");

  connectWiFi();
  connectMQTT();

  ledGreen();
  delay(1000);
  ledOff();

  Serial.println("[SUSTAV] Spreman. Čekam podatke...");
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();


  int currentDoorState = digitalRead(SENSOR_PIN);
  if (currentDoorState != lastDoorState) {
    const char* doorPayload = (currentDoorState == LOW) ? "CLOSED" : "OPEN";
    Serial.print("[DOOR] ");
    Serial.println(doorPayload);
    mqtt.publish(TOPIC_DOOR, doorPayload, true);
    lastDoorState = currentDoorState;
  }

  delay(20);
}
