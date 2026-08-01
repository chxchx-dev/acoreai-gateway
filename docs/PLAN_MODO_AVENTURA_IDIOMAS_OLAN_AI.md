# PLAN POR FASES — Modo Aventura de Idiomas para OLAN AI Gateway

> Proyecto base: `olan-ai-gateway`  
> Módulo objetivo: Idiomas / English Practice / Adventure Mode  
> Stack asumido: NestJS 10.x, TypeScript strict, Prisma 5.x, PostgreSQL, Redis, Ollama, TTS, STT, JWT, API Key Guard.  
> Diseño visual objetivo: Cyber-Olan Pulse / Neon-Grid Glassmorphism.

---

## 0. Diagnóstico directo

### Fallo
Estás intentando meter gamificación, IA generativa, speaking, exámenes, XP, títulos, niveles ocultos y rutas adaptativas como si fuera una sola funcionalidad.

### Por qué duele
Si lo haces sin separar dominio, progreso, generación IA, evaluación y UI, vas a terminar con un módulo gigante imposible de mantener. Peor: el usuario podría ganar XP duplicada, repetir temas sin control o avanzar sin validar aprendizaje real.

### Acción
Construirlo por fases, con tablas claras, reglas de negocio puras, logs de generación IA y validaciones duras antes de tocar la UI final.

---

## 1. Objetivo del módulo

Crear un **Modo Aventura de Idiomas** inspirado en Duolingo, pero conectado al ecosistema de OLAN AI Gateway.

El sistema debe permitir que cada perfil tenga:

- Nivel de idioma.
- XP acumulada.
- Títulos desbloqueables.
- Fases generadas por IA.
- Lecciones generadas por IA.
- Exámenes de validación por bloque.
- Speaking, listening, writing y charlas guiadas.
- Niveles ocultos desbloqueables por desempeño perfecto.
- Memoria de topics para evitar repetición temprana.
- Ciclo de dificultad creciente cuando los topics se agoten.

---

## 2. Reglas principales del producto

### 2.1 Alcance inicial

Este sistema aplica **solo para el módulo de idiomas**.

No debe afectar:

- Chat académico general.
- Explora / modo investigación.
- Traducción normal.
- RAG documental.
- Trial chat de landing.

### 2.2 XP por actividad

| Actividad | XP |
|---|---:|
| Lección normal completada | 10 XP |
| Examen de validación aprobado | 20 XP |
| Nivel oculto completado | 15 XP |
| Repetición obligatoria | 0 XP si ya había sido premiada |

### 2.3 XP por nivel

| Rango de nivel actual | XP necesaria para subir al siguiente nivel |
|---|---:|
| Nivel 1 al 10 | 100 XP |
| Nivel 10 al 20 | 150 XP |
| Nivel 20 al 50 | 200 XP |
| Nivel 50 al 100 | 250 XP |
| Nivel 100+ | 300 XP recomendado |

> Recomendación: como el valor de `100+` no estaba definido, usar **300 XP por nivel** en la primera versión. Si después quieres más dificultad, aplicar fórmula progresiva: `300 + floor((level - 100) / 25) * 50`.

### 2.4 Estructura de una fase

Cada fase contiene:

- 30 lecciones.
- 3 exámenes obligatorios.
- Posibles niveles ocultos opcionales.

| Bloque | Contenido | Evaluación |
|---|---|---|
| Lecciones 1–10 | Primer bloque del topic | `pre-test` |
| Lecciones 11–20 | Segundo bloque del topic | `midterm` |
| Lecciones 21–30 | Bloque final del topic | `final exam` |

### 2.5 Reglas de exámenes

Cada examen tiene:

- 2 intentos máximos.
- Puntaje mínimo recomendado: 80%.
- Preguntas generadas por IA.
- Preguntas mezcladas entre reading, vocabulary, grammar, listening y speaking cuando aplique.
- Si falla los 2 intentos, se bloquea el avance y se mandan a repetir las últimas 10 lecciones.

### 2.6 Reglas de niveles ocultos

Un nivel oculto aparece cuando:

- El usuario completa un bloque de 10 lecciones sin errores.
- El usuario mantiene precisión perfecta en el bloque.
- El usuario no usa pistas en el bloque.
- El usuario no falla ejercicios de speaking obligatorios.

El nivel oculto debe ser opcional.

Si lo completa, puede ganar:

- 15 XP.
- Un título especial.
- Una insignia visual.

---

## 3. Títulos iniciales recomendados

### 3.1 Títulos por nivel

| Rango | Título sugerido |
|---|---|
| 1–5 | Rookie Speaker |
| 6–10 | Word Explorer |
| 11–20 | Grammar Scout |
| 21–30 | Conversation Builder |
| 31–40 | Phrase Hunter |
| 41–50 | Listening Ranger |
| 51–60 | Speaking Pilot |
| 61–70 | Fluency Seeker |
| 71–80 | Dialogue Master |
| 81–90 | Accent Shaper |
| 91–100 | English Voyager |
| 100+ | Fluency Architect |

### 3.2 Títulos por logros

| Condición | Título |
|---|---|
| Completar 10 lecciones sin errores | Perfect Streak |
| Aprobar un pre-test al primer intento | Pre-Test Breaker |
| Aprobar un midterm al primer intento | Midterm Hunter |
| Aprobar un final exam al primer intento | Final Boss Clear |
| Completar una fase sin repetir bloques | Clean Phase Runner |
| Completar 5 speaking sin fallos | Voice Spark |
| Completar 10 listening perfectos | Sharp Listener |
| Completar un nivel oculto | Hidden Path Seeker |
| Completar 5 niveles ocultos | Secret World Walker |
| Llegar al nivel 100 | Fluency Core |

### 3.3 Títulos premium o especiales futuros

| Condición | Título |
|---|---|
| Racha de 7 días | Weekly Warrior |
| Racha de 30 días | Monthly Legend |
| 1.000 XP acumulada | XP Collector |
| 10.000 XP acumulada | Neon Polyglot |
| Completar una fase avanzada | Advanced Operator |
| Completar una fase de entrevistas laborales | Interview Ready |
| Completar una fase de viajes | Travel Speaker |
| Completar una fase de negocios | Business Communicator |

---

## 4. Modelo de dominio

### 4.1 Entidades principales

```txt
User
 └── LanguageProfile
      ├── XP / Level
      ├── Titles
      ├── AdventurePhases
      │    ├── Lessons
      │    ├── Exams
      │    └── HiddenLevels
      ├── TopicMemory
      └── XpTransactions
```

### 4.2 Conceptos clave

| Concepto | Responsabilidad |
|---|---|
| `LanguageProfile` | Estado principal del usuario en idiomas |
| `LanguageTitle` | Catálogo de títulos posibles |
| `UserLanguageTitle` | Títulos desbloqueados por usuario |
| `LanguageAdventurePhase` | Fase de 30 lecciones generada por IA |
| `LanguageAdventureLesson` | Lección individual |
| `LanguageAdventureExam` | Pre-test, midterm o final exam |
| `LanguageExamAttempt` | Intentos del usuario |
| `LanguageLessonProgress` | Estado por lección |
| `LanguageXpTransaction` | Historial auditable de XP |
| `LanguageTopicMemory` | Control de topics usados y dificultad |
| `LanguageHiddenLevel` | Nivel oculto opcional |
| `AiGenerationLog` | Auditoría de prompts/respuestas IA |

---

## 5. Diseño de base de datos sugerido con Prisma

> Ajustar nombres según el schema real de `estructura-bases-datos.md`. No mezclar esto con tablas de chat si no es necesario.

```prisma
enum LanguageCode {
  EN
  FR
  PT
}

enum LanguageProfileStatus {
  ACTIVE
  PAUSED
  RESET
}

enum AdventurePhaseStatus {
  DRAFT
  ACTIVE
  COMPLETED
  LOCKED
  ARCHIVED
}

enum AdventureLessonType {
  LESSON
  PRACTICE
  SPEAKING
  LISTENING
  REVIEW
  HIDDEN
}

enum LessonProgressStatus {
  LOCKED
  AVAILABLE
  IN_PROGRESS
  COMPLETED
  NEEDS_REVIEW
}

enum ExamType {
  PRE_TEST
  MIDTERM
  FINAL_EXAM
}

enum ExamStatus {
  LOCKED
  AVAILABLE
  PASSED
  FAILED
  BLOCKED_REVIEW_REQUIRED
}

enum XpSourceType {
  LESSON
  EXAM
  HIDDEN_LEVEL
  MANUAL_ADJUSTMENT
}

enum TitleUnlockSource {
  LEVEL
  ACHIEVEMENT
  HIDDEN_LEVEL
  STREAK
  ADMIN
}

model LanguageProfile {
  id              String                @id @default(cuid())
  userId          String
  languageCode    LanguageCode          @default(EN)
  status          LanguageProfileStatus @default(ACTIVE)

  currentLevel    Int                   @default(1)
  currentXp       Int                   @default(0)
  totalXp         Int                   @default(0)
  selectedTitleId String?

  currentPhaseId  String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  titles          UserLanguageTitle[]
  phases          LanguageAdventurePhase[]
  xpTransactions  LanguageXpTransaction[]
  topicMemory     LanguageTopicMemory[]

  @@unique([userId, languageCode])
  @@index([userId])
  @@index([languageCode, currentLevel])
}

model LanguageTitle {
  id              String             @id @default(cuid())
  code            String             @unique
  name            String
  description     String?
  source          TitleUnlockSource
  minLevel        Int?
  metadata        Json?
  isActive        Boolean            @default(true)
  createdAt       DateTime           @default(now())

  users           UserLanguageTitle[]
}

model UserLanguageTitle {
  id                String          @id @default(cuid())
  languageProfileId String
  titleId           String
  unlockedAt        DateTime        @default(now())
  selectedAt        DateTime?

  languageProfile   LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)
  title             LanguageTitle   @relation(fields: [titleId], references: [id])

  @@unique([languageProfileId, titleId])
  @@index([languageProfileId])
}

model LanguageAdventurePhase {
  id                String                @id @default(cuid())
  languageProfileId String
  phaseNumber       Int
  topic             String
  topicSlug         String
  difficultyLevel   Int                   @default(1)
  cefrLevel         String?               // A1, A2, B1, B2, C1
  status            AdventurePhaseStatus  @default(DRAFT)

  aiPromptHash      String?
  generatedByModel  String?
  generatedAt       DateTime?
  startedAt         DateTime?
  completedAt       DateTime?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  languageProfile   LanguageProfile       @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)
  lessons           LanguageAdventureLesson[]
  exams             LanguageAdventureExam[]
  hiddenLevels      LanguageHiddenLevel[]

  @@unique([languageProfileId, phaseNumber])
  @@index([languageProfileId, status])
  @@index([topicSlug, difficultyLevel])
}

model LanguageAdventureLesson {
  id           String              @id @default(cuid())
  phaseId      String
  lessonNumber Int
  type         AdventureLessonType @default(LESSON)
  title        String
  objective    String
  content      Json
  expectedXp   Int                 @default(10)
  unlockAfter  Int?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  phase        LanguageAdventurePhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  progress     LanguageLessonProgress[]

  @@unique([phaseId, lessonNumber])
  @@index([phaseId, type])
}

model LanguageLessonProgress {
  id                String               @id @default(cuid())
  languageProfileId String
  lessonId          String
  status            LessonProgressStatus @default(LOCKED)
  attempts          Int                  @default(0)
  errorsCount       Int                  @default(0)
  hintsUsed         Int                  @default(0)
  score             Int?
  xpAwarded         Int                  @default(0)
  startedAt         DateTime?
  completedAt       DateTime?
  updatedAt         DateTime             @updatedAt

  lesson            LanguageAdventureLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([languageProfileId, lessonId])
  @@index([languageProfileId, status])
}

model LanguageAdventureExam {
  id              String      @id @default(cuid())
  phaseId         String
  type            ExamType
  unlockAfter     Int
  title           String
  instructions    String?
  questions       Json
  passScore       Int         @default(80)
  maxAttempts     Int         @default(2)
  xpReward        Int         @default(20)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  phase           LanguageAdventurePhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  attempts        LanguageExamAttempt[]

  @@unique([phaseId, type])
  @@index([phaseId, unlockAfter])
}

model LanguageExamAttempt {
  id                String    @id @default(cuid())
  languageProfileId String
  examId            String
  attemptNumber     Int
  answers           Json
  score             Int
  passed            Boolean
  feedback          Json?
  xpAwarded         Int       @default(0)
  createdAt         DateTime  @default(now())

  exam              LanguageAdventureExam @relation(fields: [examId], references: [id], onDelete: Cascade)

  @@unique([languageProfileId, examId, attemptNumber])
  @@index([languageProfileId, passed])
}

model LanguageXpTransaction {
  id                String       @id @default(cuid())
  languageProfileId String
  sourceType        XpSourceType
  sourceId          String
  amount            Int
  reason            String
  createdAt         DateTime     @default(now())

  languageProfile   LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)

  @@unique([languageProfileId, sourceType, sourceId])
  @@index([languageProfileId, createdAt])
}

model LanguageTopicMemory {
  id                String   @id @default(cuid())
  languageProfileId String
  topic             String
  topicSlug         String
  difficultyLevel   Int      @default(1)
  usageCount        Int      @default(0)
  contentDepthScore Int      @default(0)
  exhausted         Boolean  @default(false)
  lastUsedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  languageProfile   LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)

  @@unique([languageProfileId, topicSlug, difficultyLevel])
  @@index([languageProfileId, exhausted])
}

model LanguageHiddenLevel {
  id                String    @id @default(cuid())
  phaseId           String
  languageProfileId String
  unlockBlockStart  Int
  unlockBlockEnd    Int
  title             String
  content           Json
  xpReward          Int       @default(15)
  rewardTitleId     String?
  unlockedAt        DateTime  @default(now())
  completedAt       DateTime?

  phase             LanguageAdventurePhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)

  @@index([languageProfileId, completedAt])
}

model AiGenerationLog {
  id              String   @id @default(cuid())
  userId          String?
  languageProfileId String?
  purpose         String
  model           String
  promptHash      String
  promptPreview   String?
  responsePreview String?
  responseJson    Json?
  status          String
  durationMs      Int?
  errorMessage    String?
  createdAt       DateTime @default(now())

  @@index([languageProfileId, purpose])
  @@index([createdAt])
}
```

---

## 6. Arquitectura de módulos NestJS

Crear un módulo principal:

```txt
src/languages/
  languages.module.ts

  domain/
    xp-policy.ts
    level-policy.ts
    exam-policy.ts
    title-policy.ts
    hidden-level-policy.ts

  application/
    use-cases/
      create-language-profile.use-case.ts
      get-language-dashboard.use-case.ts
      generate-adventure-phase.use-case.ts
      complete-lesson.use-case.ts
      submit-exam-attempt.use-case.ts
      unlock-hidden-levels.use-case.ts
      select-next-topic.use-case.ts
      award-xp.use-case.ts
      recalculate-level.use-case.ts
    services/
      language-xp.service.ts
      language-title.service.ts
      language-topic-memory.service.ts
      adventure-generation.service.ts
      exam-evaluation.service.ts
      hidden-level.service.ts

  infrastructure/
    repositories/
      language-profile.repository.ts
      adventure-phase.repository.ts
      lesson-progress.repository.ts
      exam.repository.ts
      topic-memory.repository.ts
      title.repository.ts
      xp-transaction.repository.ts
    ai/
      adventure-ai-generator.adapter.ts
      exam-ai-generator.adapter.ts
      speaking-ai-evaluator.adapter.ts

  interface/http/
    dto/
      create-language-profile.dto.ts
      generate-phase.dto.ts
      complete-lesson.dto.ts
      submit-exam-attempt.dto.ts
      select-title.dto.ts
    controllers/
      language-profile.controller.ts
      language-adventure.controller.ts
      language-exams.controller.ts
      language-titles.controller.ts
```

### Regla dura
No meter toda esta lógica dentro de `chat`, `translate`, `tts` o `stt`. Esos módulos se consumen como capacidades, pero el dominio del modo aventura vive en `src/languages`.

---

## 7. Fases de implementación

## Fase 0 — Auditoría y preparación

### Objetivo
Preparar el terreno sin romper lo existente.

### Tareas

1. Crear rama:

```bash
git checkout -b feature/language-adventure-mode
```

2. Revisar:

```txt
@olan-ai-gateway/docs/estructura-bases-datos.md
prisma/schema.prisma
src/auth/
src/chat/
src/translate/
src/tts/
src/stt/
src/application/services/prompt-builder.service.ts
```

3. Confirmar cómo se obtiene `userId`:

- JWT.
- `source` confiable.
- Payload manual desde app OLAN.

4. Crear documento:

```txt
docs/LANGUAGE_ADVENTURE_MODE.md
```

### Entregables

- Rama creada.
- Documento base creado.
- Lista de tablas existentes relacionadas con usuario.
- Confirmación de relación con `User`.

### Validación

```bash
pnpm build
pnpm test
```

---

## Fase 1 — Base de datos y migraciones

### Objetivo
Crear el esquema persistente del módulo.

### Tareas

1. Agregar enums al `schema.prisma`.
2. Agregar modelos de perfil, fases, lecciones, exámenes, XP, títulos y topics.
3. Crear migración:

```bash
pnpm exec prisma migrate dev --name add_language_adventure_mode
pnpm exec prisma generate
```

4. Crear seed de títulos iniciales:

```txt
prisma/seeds/language-titles.seed.ts
```

5. Crear índices únicos para evitar XP duplicada.

### Entregables

- Migración Prisma.
- Seed de títulos.
- Modelos generados.
- Documento actualizado con ERD textual.

### Validación

```bash
pnpm exec prisma studio
pnpm build
```

### Riesgo crítico
Si no haces `LanguageXpTransaction` con índice único por `sourceType + sourceId`, vas a duplicar XP cada vez que el usuario refresque, reintente o falle una request.

---

## Fase 2 — Motor de XP, niveles y títulos

### Objetivo
Crear reglas puras y testeables.

### Archivos sugeridos

```txt
src/languages/domain/xp-policy.ts
src/languages/domain/level-policy.ts
src/languages/application/services/language-xp.service.ts
src/languages/application/services/language-title.service.ts
```

### Reglas

```ts
export function getRequiredXpForLevel(currentLevel: number): number {
  if (currentLevel < 10) return 100;
  if (currentLevel < 20) return 150;
  if (currentLevel < 50) return 200;
  if (currentLevel < 100) return 250;
  return 300;
}
```

### Comportamiento esperado

Cuando entra XP:

1. Se crea una transacción auditable.
2. Se suma a `totalXp`.
3. Se suma a `currentXp`.
4. Se recalcula si sube uno o varios niveles.
5. Se desbloquean títulos por nivel.
6. Se retorna resumen al frontend.

### Payload de respuesta recomendado

```json
{
  "xpAwarded": 10,
  "totalXp": 470,
  "currentXp": 70,
  "currentLevel": 5,
  "leveledUp": false,
  "unlockedTitles": []
}
```

### Entregables

- Servicio de XP.
- Servicio de títulos.
- Tests unitarios de rangos.
- Prevención de XP duplicada.

### Validación mínima

Casos a probar:

- Nivel 1 con 90 XP recibe 10 XP y sube a nivel 2.
- Nivel 9 usa 100 XP requerido.
- Nivel 10 usa 150 XP requerido.
- Nivel 20 usa 200 XP requerido.
- Nivel 50 usa 250 XP requerido.
- Nivel 100 usa 300 XP requerido.
- Repetir misma lección no duplica XP.

---

## Fase 3 — Memoria de topics y selección automática

### Objetivo
Evitar que la IA repita temas demasiado pronto.

### Regla base
Cada fase tiene un topic principal. Si el topic no da para 30 lecciones ricas, el sistema puede anexar subtopics relacionados.

### Ejemplo

Topic principal:

```txt
Daily routines
```

Subtopics anexados:

```txt
morning routine
school schedule
free time
frequency adverbs
simple present questions
```

### Flujo de selección

```txt
1. Obtener topics usados por el perfil.
2. Buscar topic no usado en el mismo difficultyLevel.
3. Si el topic está agotado, anexar subtopics.
4. Si todos los topics están cubiertos, aumentar difficultyLevel.
5. Repetir topics, pero con mayor complejidad.
```

### Topics iniciales sugeridos

#### Nivel bajo / A1

- Greetings and introductions
- Personal information
- Numbers and age
- Family members
- School objects
- Classroom language
- Colors and shapes
- Daily routines
- Food and drinks
- Likes and dislikes
- Days, months and dates
- Basic directions
- Simple present habits
- There is / there are
- Describing people

#### Nivel medio / A2-B1

- Past experiences
- Future plans
- Travel situations
- Shopping conversations
- Health and symptoms
- Asking for help
- Describing places
- Comparing things
- Hobbies and preferences
- School projects
- Technology habits
- Environmental topics
- Giving opinions
- Telling stories
- Job interviews basic

#### Nivel avanzado / B2+

- Academic discussion
- Critical thinking
- Debate and argumentation
- Professional interviews
- Business communication
- Presentations
- Negotiation
- Problem solving
- Cultural differences
- News discussion
- Ethics and AI
- Scientific explanation
- Abstract opinions
- Persuasive speaking
- Advanced storytelling

### Entregables

- Servicio `LanguageTopicMemoryService`.
- Seed de topics base.
- Regla de dificultad cíclica.
- Endpoint admin para ver topics usados.

---

## Fase 4 — Generador IA de fases

### Objetivo
Generar automáticamente una fase completa con 30 lecciones y 3 exámenes.

### Regla técnica
La IA no debe escribir directo en base de datos. La IA genera JSON, el backend valida, normaliza y persiste.

### Prompt base para generar fase

```txt
You are an English learning curriculum generator for OLAN.
Generate one adventure phase for a Spanish-speaking student learning English.

Return ONLY valid JSON. No markdown.

Rules:
- The phase must have exactly 30 lessons.
- Lessons 1-10 prepare the PRE_TEST.
- Lessons 11-20 prepare the MIDTERM.
- Lessons 21-30 prepare the FINAL_EXAM.
- Each lesson must have a clear objective.
- Include speaking, listening, grammar, vocabulary and conversation practice.
- Difficulty must match CEFR level: {{cefrLevel}}.
- Main topic: {{topic}}.
- Optional subtopics: {{subtopics}}.
- Avoid repeating previously used topics: {{usedTopics}}.
- Student native language: Spanish.
- Target language: English.

JSON schema:
{
  "topic": "string",
  "cefrLevel": "A1|A2|B1|B2|C1",
  "difficultyLevel": 1,
  "lessons": [
    {
      "lessonNumber": 1,
      "type": "LESSON|SPEAKING|LISTENING|PRACTICE|REVIEW",
      "title": "string",
      "objective": "string",
      "estimatedMinutes": 5,
      "content": {
        "intro": "string",
        "vocabulary": [{"term":"string", "meaningEs":"string", "example":"string"}],
        "grammar": "string",
        "practice": [{"type":"multiple_choice|fill_blank|speaking|listening|conversation", "question":"string", "answer":"string", "options":["string"]}],
        "feedbackRules": ["string"]
      }
    }
  ],
  "exams": [
    {
      "type": "PRE_TEST",
      "unlockAfter": 10,
      "title": "Pre-Test: string",
      "questions": []
    },
    {
      "type": "MIDTERM",
      "unlockAfter": 20,
      "title": "Midterm: string",
      "questions": []
    },
    {
      "type": "FINAL_EXAM",
      "unlockAfter": 30,
      "title": "Final Exam: string",
      "questions": []
    }
  ]
}
```

### Validaciones obligatorias

- Exactamente 30 lecciones.
- Lesson numbers del 1 al 30 sin saltos.
- Exactamente 3 exámenes.
- `unlockAfter`: 10, 20, 30.
- Cada examen mínimo 10 preguntas.
- Cada lección debe tener objetivo.
- No permitir JSON inválido.
- Si falla el JSON, reintentar una vez con prompt de reparación.

### Entregables

- `AdventureAiGeneratorAdapter`.
- DTO/Zod schema de validación.
- Persistencia de `AiGenerationLog`.
- Endpoint para generar fase.

---

## Fase 5 — Motor de avance de lecciones

### Objetivo
Controlar qué lección está disponible, completada o bloqueada.

### Regla de desbloqueo

```txt
Lección 1 disponible al iniciar fase.
Lección N disponible si N-1 está completada.
Examen disponible si las 10 lecciones previas están completadas.
Bloque siguiente disponible solo si el examen anterior está aprobado.
```

### Flujo al completar lección

```txt
1. Validar que la lección pertenece al perfil.
2. Validar que está disponible.
3. Evaluar respuestas.
4. Guardar errores, pistas y score.
5. Marcar como completada.
6. Otorgar 10 XP si no había sido premiada.
7. Desbloquear siguiente lección o examen.
8. Evaluar si aplica nivel oculto.
```

### Entregables

- Use case `CompleteLessonUseCase`.
- Servicio de progreso.
- XP por lección.
- Desbloqueo secuencial.
- Tests de avance.

---

## Fase 6 — Exámenes, intentos y repetición obligatoria

### Objetivo
Implementar `pre-test`, `midterm` y `final exam` con reglas de bloqueo.

### Reglas

- Cada examen tiene 2 intentos.
- Si aprueba, recibe 20 XP.
- Si falla el primer intento, puede reintentar.
- Si falla el segundo intento, se activa repaso obligatorio de las últimas 10 lecciones.
- Las lecciones repetidas no deben dar XP duplicada.
- El examen vuelve a estar disponible después de completar el repaso.

### Bloques de repaso

| Examen fallado | Lecciones a repetir |
|---|---|
| `PRE_TEST` | 1–10 |
| `MIDTERM` | 11–20 |
| `FINAL_EXAM` | 21–30 |

### Flujo de intento

```txt
1. Validar examen disponible.
2. Obtener intentos previos.
3. Si ya tiene 2 intentos fallidos, bloquear.
4. Evaluar respuestas.
5. Guardar intento.
6. Si score >= passScore, marcar aprobado y dar XP.
7. Si falla y quedan intentos, permitir reintento.
8. Si falla segundo intento, marcar bloque como NEEDS_REVIEW.
```

### Entregables

- Use case `SubmitExamAttemptUseCase`.
- Servicio `ExamEvaluationService`.
- Reglas de bloqueo.
- Reglas de repaso.
- XP por examen.

---

## Fase 7 — Speaking, listening y charlas generadas por IA

### Objetivo
Integrar STT, TTS y prompts conversacionales al modo aventura.

### Tipos de práctica

| Tipo | Usa IA | Usa STT | Usa TTS |
|---|---:|---:|---:|
| Vocabulary | Sí | No | Opcional |
| Grammar | Sí | No | No |
| Listening | Sí | No | Sí |
| Speaking | Sí | Sí | Opcional |
| Conversation | Sí | Sí | Sí |

### Evaluación de speaking

La IA debe evaluar:

- Intención comunicativa.
- Vocabulario usado.
- Gramática.
- Claridad.
- Respuesta esperada.
- Correcciones cortas.

### Prompt de evaluación speaking

```txt
You are an English speaking evaluator for OLAN.
Student native language: Spanish.
Target language: English.
CEFR level: {{cefrLevel}}.
Lesson objective: {{objective}}.
Expected answer idea: {{expectedAnswer}}.
Student transcription: {{transcription}}.

Return ONLY valid JSON:
{
  "score": 0,
  "passed": true,
  "strengths": ["string"],
  "mistakes": ["string"],
  "correctedAnswer": "string",
  "shortFeedbackEs": "string"
}
```

### Entregables

- Adapter `SpeakingAiEvaluatorAdapter`.
- Integración con STT.
- Integración opcional con TTS.
- Guardado de feedback en progreso de lección.

---

## Fase 8 — Niveles ocultos

### Objetivo
Premiar desempeño perfecto sin obligar al usuario.

### Condición inicial

Aparece un nivel oculto si el usuario completa un bloque de 10 lecciones con:

```txt
errorsCount = 0
hintsUsed = 0
score promedio >= 95
sin intentos fallidos
```

### Flujo

```txt
1. Usuario completa lección 10, 20 o 30.
2. Sistema evalúa el bloque anterior.
3. Si cumple condición, genera nivel oculto.
4. Lo muestra como ruta opcional.
5. Si lo completa, gana 15 XP y posible título.
```

### Tipos de niveles ocultos

- Mini conversación sorpresa.
- Challenge de pronunciación.
- Listening rápido.
- Grammar boss.
- Vocabulary speedrun.
- Story mode corto.

### Títulos asociados

| Nivel oculto | Título |
|---|---|
| Primer oculto completado | Hidden Path Seeker |
| 5 ocultos completados | Secret World Walker |
| Oculto sin errores | Shadow Fluent |
| Oculto de speaking perfecto | Voice Ghost |

### Entregables

- Servicio `HiddenLevelService`.
- Generador IA de nivel oculto.
- XP de 15.
- Desbloqueo de título.

---

## Fase 9 — API HTTP

### Objetivo
Exponer endpoints limpios para la app/web.

### Endpoints sugeridos

```http
GET    /api/languages/me
POST   /api/languages/profiles
GET    /api/languages/titles
PATCH  /api/languages/titles/select

GET    /api/languages/adventure/current
POST   /api/languages/adventure/phases/generate
GET    /api/languages/adventure/phases/:phaseId
POST   /api/languages/adventure/lessons/:lessonId/start
POST   /api/languages/adventure/lessons/:lessonId/complete

GET    /api/languages/adventure/exams/:examId
POST   /api/languages/adventure/exams/:examId/attempts

GET    /api/languages/adventure/hidden-levels
POST   /api/languages/adventure/hidden-levels/:hiddenLevelId/complete

GET    /api/languages/topics/me
GET    /api/admin/languages/topics
```

### Seguridad

Todos los endpoints deben usar:

```txt
x-ai-gateway-key
JwtAuthGuard cuando aplique
RolesGuard para admin
ValidationPipe
ThrottlerGuard
```

### Entregables

- Controllers.
- DTOs.
- Swagger.
- Respuestas estándar.
- Errores 400/401/403/404/409/429.

---

## Fase 10 — UI del Modo Aventura

### Objetivo
Crear un apartado nuevo con experiencia inmersiva.

### Ruta sugerida

```txt
/idiomas/aventura
```

### Pantallas mínimas

| Pantalla | Propósito |
|---|---|
| Dashboard de idioma | Nivel, XP, título, fase actual |
| Mapa de aventura | 30 lecciones + exámenes + ocultos |
| Lección | Contenido y práctica |
| Speaking | Grabación, feedback y corrección |
| Listening | Reproducción + preguntas |
| Examen | Preguntas, intentos, resultado |
| Títulos | Selección de título visible |
| Topics cubiertos | Progreso temático |

### Diseño visual

Usar estilo:

- Fondo oscuro tipo cyber-learning.
- Cards con glassmorphism.
- Progreso con neon cyan.
- Badges con JetBrains Mono.
- Estados activos con glow.
- Olan como guía visual.
- Mapa vertical tipo aventura con nodos.
- Exámenes como boss nodes.
- Niveles ocultos como nodos con brillo púrpura.

### Estados visuales de nodos

| Estado | UI |
|---|---|
| Bloqueado | Gris, baja opacidad |
| Disponible | Borde cyan |
| Completado | Glow verde/cyan |
| Examen | Nodo grande tipo boss |
| Oculto | Púrpura, animación sutil |
| Repetición requerida | Borde naranja/alerta |

### Componentes sugeridos

```txt
features/languages/adventure/
  components/
    AdventureMap.tsx
    AdventureNode.tsx
    XpProgressCard.tsx
    CurrentTitleBadge.tsx
    LessonPlayer.tsx
    ExamPlayer.tsx
    SpeakingChallenge.tsx
    HiddenLevelCard.tsx
    TopicCoveragePanel.tsx
```

---

## Fase 11 — Admin y control de calidad

### Objetivo
Evitar que la IA genere basura sin que nadie lo note.

### Panel admin sugerido

```txt
/admin/languages
```

Debe permitir ver:

- Fases generadas.
- JSON generado.
- Modelo usado.
- Tiempo de generación.
- Errores de generación.
- Topics agotados.
- Usuarios estancados.
- Exámenes con alta tasa de fallo.
- Lecciones con feedback negativo.

### Métricas recomendadas

| Métrica | Uso |
|---|---|
| `language_phase_generated_total` | Saber cuántas fases genera la IA |
| `language_exam_failed_total` | Detectar exámenes mal calibrados |
| `language_lesson_completed_total` | Medir avance |
| `language_hidden_unlocked_total` | Medir retos perfectos |
| `language_ai_generation_failed_total` | Detectar prompts malos |
| `language_xp_awarded_total` | Auditar XP |

---

## Fase 12 — Testing obligatorio

### Unit tests

- XP por nivel.
- Subida múltiple de nivel.
- No duplicar XP.
- Desbloqueo de títulos.
- Selección de topics.
- Desbloqueo de niveles ocultos.
- Bloqueo por examen fallado.

### Integration tests

- Crear perfil.
- Generar fase.
- Completar 10 lecciones.
- Desbloquear pre-test.
- Fallar 2 intentos.
- Repetir últimas 10.
- Aprobar y avanzar.
- Completar fase.
- Generar siguiente fase.

### Prueba crítica

```txt
El usuario no debe poder avanzar al bloque 11–20 si no aprobó el pre-test.
El usuario no debe ganar dos veces XP por la misma lección.
El usuario no debe repetir topic en el mismo difficultyLevel si todavía hay topics nuevos.
```

---

## 8. Flujo completo del usuario

```txt
1. Usuario entra a Idiomas.
2. Si no tiene LanguageProfile, se crea uno.
3. Entra a Modo Aventura.
4. Si no tiene fase activa, backend genera una fase con IA.
5. Usuario completa lecciones 1–10.
6. Gana 10 XP por cada lección.
7. Si completó sin errores, aparece nivel oculto opcional.
8. Se desbloquea pre-test.
9. Tiene 2 intentos.
10. Si aprueba, gana 20 XP y pasa al bloque 11–20.
11. Si falla 2 veces, repite 1–10.
12. Repite proceso con midterm y final exam.
13. Al aprobar final exam, se marca fase completada.
14. Se selecciona un nuevo topic.
15. Se genera la siguiente fase.
16. Si los topics se agotan, se repiten con dificultad superior.
```

---

## 9. Reglas anti-trampa y consistencia

### No permitir

- Completar lección bloqueada.
- Completar examen bloqueado.
- Ganar XP dos veces por la misma fuente.
- Crear dos fases activas para el mismo perfil.
- Generar fase sin topic registrado.
- Aceptar JSON IA sin validación.
- Avanzar después de fallar 2 intentos sin repaso.

### Sí permitir

- Repetir lecciones por práctica.
- Repetir bloques obligatorios sin XP extra.
- Completar niveles ocultos opcionales.
- Cambiar título visible.
- Regenerar fase solo por admin si salió defectuosa.

---

## 10. Recomendaciones técnicas

### Recomendación 1 — No generes todo bajo demanda en cada pantalla
Genera la fase una vez, valida y guarda. Si generas cada lección en vivo, tendrás inconsistencias, latencia y costos de tokens.

### Recomendación 2 — Usa Redis solo para caché, no como fuente principal
El progreso, XP, exámenes y títulos deben vivir en PostgreSQL. Redis puede cachear dashboard o generación temporal.

### Recomendación 3 — Guarda logs de IA
Cuando una fase salga mala, necesitas saber qué prompt, modelo y respuesta la generó.

### Recomendación 4 — No dejes que el frontend calcule XP
El frontend muestra. El backend decide. Si el frontend calcula XP, el sistema queda fácil de manipular.

### Recomendación 5 — Primero backend, después animaciones
La tentación será hacer el mapa bonito primero. Error. Sin motor de progreso, solo tendrás una maqueta.

---

## 11. Orden real de trabajo por días

### Día 1

- Crear documento.
- Crear rama.
- Revisar schema actual.
- Definir relación con User.
- Agregar modelos Prisma.

### Día 2

- Migración.
- Seeds de títulos.
- Servicio de XP.
- Tests de XP.

### Día 3

- Servicio de topics.
- Generador IA de fase.
- Validación JSON.
- `AiGenerationLog`.

### Día 4

- Motor de lecciones.
- Completar lección.
- Desbloqueo secuencial.
- XP por lección.

### Día 5

- Exámenes.
- Intentos.
- Repaso obligatorio.
- XP por examen.

### Día 6

- Niveles ocultos.
- Títulos por logros.
- Tests de flujo completo.

### Día 7

- Endpoints.
- Swagger.
- Dashboard API.
- Primera UI funcional sin exceso visual.

### Día 8+

- UI inmersiva.
- Animaciones.
- Speaking/listening avanzado.
- Admin panel.
- Métricas.

---

## 12. Checklist de entrega MVP

- [ ] `LanguageProfile` creado por usuario.
- [ ] XP y niveles funcionando.
- [ ] Títulos iniciales sembrados.
- [ ] Fase IA con 30 lecciones.
- [ ] Pre-test en lección 10.
- [ ] Midterm en lección 20.
- [ ] Final exam en lección 30.
- [ ] 2 intentos por examen.
- [ ] Repaso obligatorio al fallar 2 veces.
- [ ] Topics guardados y no repetidos temprano.
- [ ] Niveles ocultos opcionales.
- [ ] XP auditada.
- [ ] No hay XP duplicada.
- [ ] Endpoints documentados.
- [ ] UI básica del mapa.
- [ ] Diseño Cyber-Olan aplicado.

---

## 13. Prompt para Codex / Claude

```md
# Tarea: Implementar Modo Aventura de Idiomas en OLAN AI Gateway

Trabaja sobre el proyecto existente `olan-ai-gateway`.

## Contexto
El proyecto usa NestJS 10.x, TypeScript strict, Prisma, PostgreSQL, Redis, Ollama, TTS, STT, JWT y API Key Guard.
Ya existen módulos de chat, conversaciones, traducción, TTS, STT, logs, auth, prisma, redis y prompts educativos.

## Objetivo
Crear el módulo `src/languages` para manejar perfiles de idioma, XP, niveles, títulos, fases de aventura generadas por IA, lecciones, exámenes, niveles ocultos y memoria de topics.

## Reglas de negocio
- Aplica solo a idiomas.
- Cada perfil tiene nivel, XP total, XP actual y título visible.
- Lección completada: 10 XP.
- Examen aprobado: 20 XP.
- Nivel oculto completado: 15 XP.
- XP por nivel:
  - 1-10: 100 XP
  - 10-20: 150 XP
  - 20-50: 200 XP
  - 50-100: 250 XP
  - 100+: 300 XP
- Cada fase tiene 30 lecciones.
- Cada 10 lecciones hay examen:
  - 10: PRE_TEST
  - 20: MIDTERM
  - 30: FINAL_EXAM
- Cada examen tiene 2 intentos.
- Si falla 2 intentos, debe repetir las últimas 10 lecciones.
- No duplicar XP por misma lección, examen o nivel oculto.
- Guardar topics usados para evitar repetición.
- Si los topics se agotan, repetir con dificultad superior.
- Los niveles ocultos aparecen si completa 10 lecciones sin errores.

## Implementación requerida
1. Agregar modelos Prisma.
2. Crear migración.
3. Crear seeds de títulos.
4. Crear `src/languages` con dominio, aplicación, infraestructura e interface/http.
5. Crear servicios:
   - LanguageXpService
   - LanguageTitleService
   - LanguageTopicMemoryService
   - AdventureGenerationService
   - ExamEvaluationService
   - HiddenLevelService
6. Crear casos de uso:
   - CreateLanguageProfileUseCase
   - GetLanguageDashboardUseCase
   - GenerateAdventurePhaseUseCase
   - CompleteLessonUseCase
   - SubmitExamAttemptUseCase
   - UnlockHiddenLevelsUseCase
7. Crear endpoints REST bajo `/api/languages`.
8. Crear validaciones DTO.
9. Crear tests unitarios del motor XP y exámenes.
10. Documentar en `docs/LANGUAGE_ADVENTURE_MODE.md`.

## Restricciones
- No meter lógica de aventura dentro de `chat`, `translate`, `tts` o `stt`.
- No permitir que el frontend calcule XP.
- No aceptar JSON IA sin validarlo.
- No duplicar XP.
- No crear dos fases activas para el mismo perfil.
- No romper endpoints existentes.

## Criterio de éxito
- `pnpm build` pasa.
- Migración Prisma corre.
- Se puede crear perfil de idioma.
- Se puede generar una fase de 30 lecciones.
- Se puede completar una lección y ganar XP.
- Se desbloquea pre-test al completar 10 lecciones.
- El examen respeta 2 intentos.
- Al fallar 2 intentos, bloquea avance y manda a repaso.
- Al completar 10 lecciones sin errores, aparece nivel oculto.
```

---

## 14. Fallo final que debes evitar

No conviertas esto en “otra funcionalidad más”. Esto es un sistema de aprendizaje completo.

Si construyes solo la UI, tendrás humo.
Si construyes solo prompts, tendrás contenido suelto.
Si construyes solo XP, tendrás gamificación vacía.

La versión correcta es:

```txt
Base de datos sólida
+ motor de progreso
+ IA controlada
+ evaluación real
+ UI inmersiva
+ métricas
```

Ese es el camino.
