## AI Agent "Astra" Response Examples

### 1) Plain response (no action)
```json
{
  "message": "We can start a reading or explore features. What would you like to do?",
  "action": null
}
```

### 2) Navigate to pricing
```json
{
  "message": "Sure—I'll take you to pricing so you can compare plans.",
  "action": {
    "type": "NAVIGATE",
    "payload": { "page": "/pricing" }
  }
}
```

### 3) Start a love reading
```json
{
  "message": "Let’s begin a love reading. Tell me your question, and I’ll guide the next step.",
  "action": {
    "type": "START_READING",
    "payload": { "type": "love" }
  }
}
```

### 4) Draw three tarot cards (in reading flow)
```json
{
  "message": "Great—please draw three cards for this reading.",
  "action": {
    "type": "DRAW_TAROT_CARD",
    "payload": { "count": 3 }
  }
}
```

### 5) Open a modal
```json
{
  "message": "I’ll open the help panel so you can see guidance.",
  "action": {
    "type": "OPEN_MODAL",
    "payload": { "modalId": "help" }
  }
}
```
