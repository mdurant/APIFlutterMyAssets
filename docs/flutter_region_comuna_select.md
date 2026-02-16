# Selects Región y Comuna en Flutter (por nombre, envío UUID)

---

## Solución: "Error de red" en la app

Si la app Flutter no conecta con el backend, **no uses `localhost`** desde el emulador o un dispositivo físico. Usa la URL según dónde corre la app:

| Dónde corre la app | baseUrl (reemplaza por la tuya) |
|--------------------|----------------------------------|
| **Android Emulator** | `http://10.0.2.2:3000/api/v1` — `10.0.2.2` es el localhost del PC desde el emulador Android. |
| **iOS Simulator** | `http://127.0.0.1:3000/api/v1` (o `http://localhost:3000/api/v1`) |
| **Dispositivo físico** (móvil/tablet en la misma WiFi) | `http://TU_IP_LOCAL:3000/api/v1` — Ej: `http://192.168.1.10:3000/api/v1`. En el PC ejecuta `ipconfig` (Windows) o `ifconfig` (Mac/Linux) para ver tu IP. |

Requisitos:

1. Backend en marcha: `cd backend && npm run dev`.
2. El servidor escucha en `0.0.0.0` (ya configurado) para aceptar conexiones desde la red.
3. En Flutter, configura **una sola** baseUrl para toda la API (auth, regiones, comunas), por ejemplo con una variable o constante:

```dart
// Ejemplo: lib/core/api_config.dart
class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1';  // Android Emulator
  // static const String baseUrl = 'http://192.168.1.10:3000/api/v1';  // Dispositivo real
}
```

Usa `ApiConfig.baseUrl` en registro, login, regiones y comunas.

---

La API expone:

- **GET** `/api/v1/regions` → `{ "success": true, "data": [ { "id": "uuid", "nombre": "Región de Valparaíso" }, ... ] }`
- **GET** `/api/v1/comunas?regionId=uuid` → `{ "success": true, "data": [ { "id": "uuid", "nombre": "Viña del Mar" }, ... ] }`

En el registro debes usar **selects** que muestren el **nombre** y envíen el **id** (UUID) en `regionId` y `comunaId`.

---

## 1. Modelos (opcional pero recomendado)

```dart
// lib/models/region.dart
class Region {
  final String id;
  final String nombre;
  Region({required this.id, required this.nombre});
  factory Region.fromJson(Map<String, dynamic> json) =>
      Region(id: json['id'] as String, nombre: json['nombre'] as String);
}

// lib/models/comuna.dart
class Comuna {
  final String id;
  final String nombre;
  Comuna({required this.id, required this.nombre});
  factory Comuna.fromJson(Map<String, dynamic> json) =>
      Comuna(id: json['id'] as String, nombre: json['nombre'] as String);
}
```

---

## 2. Servicio para cargar regiones y comunas

```dart
// lib/services/region_comuna_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/region.dart';
import '../models/comuna.dart';

class RegionComunaService {
  final String baseUrl;

  /// baseUrl: Android Emulator use http://10.0.2.2:3000/api/v1
  ///          Dispositivo real use http://TU_IP:3000/api/v1
  RegionComunaService({this.baseUrl = 'http://10.0.2.2:3000/api/v1'});

  Future<List<Region>> getRegions() async {
    final r = await http.get(Uri.parse('$baseUrl/regions'));
    if (r.statusCode != 200) throw Exception('Error cargando regiones');
    final json = jsonDecode(r.body);
    final list = (json['data'] as List).cast<Map<String, dynamic>>();
    return list.map((e) => Region.fromJson(e)).toList();
  }

  Future<List<Comuna>> getComunas(String regionId) async {
    final r = await http.get(
      Uri.parse('$baseUrl/comunas').replace(queryParameters: {'regionId': regionId}),
    );
    if (r.statusCode != 200) throw Exception('Error cargando comunas');
    final json = jsonDecode(r.body);
    final list = (json['data'] as List).cast<Map<String, dynamic>>();
    return list.map((e) => Comuna.fromJson(e)).toList();
  }
}
```

---

## 3. Pantalla de registro: selects por nombre

Reemplaza los campos **"ID Región"** e **"ID Comuna"** (numéricos) por dos **DropdownButtonFormField** que:

1. **Región:** cargue `GET /regions`, muestre `nombre`, guarde `id` (UUID) en `regionId`.
2. **Comuna:** al elegir región, cargue `GET /comunas?regionId=...`, muestre `nombre`, guarde `id` (UUID) en `comunaId`.

Ejemplo de estado y widgets:

```dart
// En tu pantalla de registro (stateful o con state management)

List<Region> _regions = [];
List<Comuna> _comunas = [];
String? _regionId;   // UUID seleccionado
String? _comunaId;   // UUID seleccionado
bool _loadingRegions = true;
bool _loadingComunas = false;
final _regionService = RegionComunaService(baseUrl: 'http://TU_IP:3000/api/v1');

@override
void initState() {
  super.initState();
  _loadRegions();
}

Future<void> _loadRegions() async {
  setState(() => _loadingRegions = true);
  try {
    final list = await _regionService.getRegions();
    setState(() {
      _regions = list;
      _loadingRegions = false;
    });
  } catch (e) {
    setState(() => _loadingRegions = false);
    // mostrar error
  }
}

Future<void> _onRegionChanged(String? regionId) async {
  setState(() {
    _regionId = regionId;
    _comunaId = null;
    _comunas = [];
    if (regionId == null) return;
    _loadingComunas = true;
  });
  try {
    final list = await _regionService.getComunas(regionId!);
    setState(() {
      _comunas = list;
      _loadingComunas = false;
    });
  } catch (e) {
    setState(() => _loadingComunas = false);
  }
}

// Select Región (muestra nombre, valor es UUID)
DropdownButtonFormField<String>(
  value: _regionId,
  decoration: InputDecoration(
    labelText: 'Región',
    border: OutlineInputBorder(),
  ),
  hint: Text(_loadingRegions ? 'Cargando...' : 'Seleccione región'),
  items: _regions
      .map((r) => DropdownMenuItem(value: r.id, child: Text(r.nombre)))
      .toList(),
  onChanged: _loadingRegions ? null : _onRegionChanged,
  validator: (v) => v == null ? 'Seleccione una región' : null,
),

SizedBox(height: 16),

// Select Comuna (muestra nombre, valor es UUID; depende de región)
DropdownButtonFormField<String>(
  value: _comunaId,
  decoration: InputDecoration(
    labelText: 'Comuna',
    border: OutlineInputBorder(),
  ),
  hint: Text(
    _regionId == null
        ? 'Primero seleccione región'
        : _loadingComunas
            ? 'Cargando...'
            : 'Seleccione comuna',
  ),
  items: _comunas
      .map((c) => DropdownMenuItem(value: c.id, child: Text(c.nombre)))
      .toList(),
  onChanged: _loadingComunas || _regionId == null
      ? null
      : (v) => setState(() => _comunaId = v),
  validator: (v) => v == null ? 'Seleccione una comuna' : null,
),
```

Al enviar el formulario de registro, manda **UUIDs** en el body:

```dart
final body = {
  'email': emailController.text.trim(),
  'password': passwordController.text,
  'nombres': nombresController.text.trim(),
  'apellidos': apellidosController.text.trim(),
  'sexo': sexoValue,           // 'HOMBRE' | 'MUJER' | 'OTRO'
  'fechaNacimiento': fechaNacimiento, // '2000-01-01'
  'domicilio': domicilioController.text.trim(),
  'regionId': _regionId,       // UUID o null
  'comunaId': _comunaId,      // UUID o null
  'acceptTerms': acceptTerms,
};
```

Así dejas de enviar números (1, 1) y el backend recibe los UUID correctos; el error "regionId must be a UUID" desaparece.

---

## 4. Resumen

| Antes (mal)      | Después (bien)                          |
|------------------|-----------------------------------------|
| Campo texto "ID Región" con valor 1 | Select "Región" con nombres; valor interno = UUID |
| Campo texto "ID Comuna" con valor 1  | Select "Comuna" con nombres; valor interno = UUID |
| Body: `regionId: 1`                 | Body: `regionId: "uuid-de-la-region"`   |
| Body: `comunaId: 1`                 | Body: `comunaId: "uuid-de-la-comuna"`   |

Si tu app usa **Dio** o otro cliente HTTP, sustituye `http.get` por ese cliente y mantén las mismas URLs y el mismo manejo de `data` (lista de `{ id, nombre }`).
