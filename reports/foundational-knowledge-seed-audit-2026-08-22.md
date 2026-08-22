# Auditoría editorial y estructural — Foundational Knowledge Seed de JANO

Fecha: 2026-08-22. Auditoría de sólo lectura. Fuente: `backend/api/prisma/foundational/catalog.ts` y PostgreSQL. Verificación por slug y tripleta from/type/to: catálogo **768 entidades / 2.340 relaciones**; DB del subconjunto seed **768 / 2.340**; ausentes 0, relaciones faltantes 0, extras 0. El conteo global de DB (770/2.341) contiene ARTICLE, MEME y una relación ajenos a la seed y no se incluyen.

## 1. Executive Summary

La Foundational Seed es un Knowledge Core de 768 nodos: cronología, 52 movimientos, 201 personas, 224 obras, 204 conceptos (incluidas técnicas/materiales), 54 lugares, 18 instituciones y 6 eventos. Construye una exploración relacional de historia del arte, fuerte en Europa/EE. UU. y 1800–presente, con puertas hacia Antigüedad, Asia, África y América Latina. No pretende ser una colección de ensayos: no hay imágenes ni fichas extensas pobladas.

## 2. Final Numbers

**Entities:** 768  
**Relations:** 2.340

### EntityClass distribution

- `ABSTRACTION`: 265
- `WORK`: 224
- `PERSON`: 201
- `PLACE`: 54
- `ORGANIZATION`: 18
- `EVENT`: 6

### EntityType distribution

- `ARTWORK`: 224
- `CONCEPT`: 204
- `ARTIST`: 201
- `PLACE`: 54
- `MOVEMENT`: 52
- `ORGANIZATION`: 18
- `PERIOD`: 9
- `EVENT`: 6

## 3. Complete Entity Inventory

Inventario completo de DB, agrupado por EntityClass y EntityType. Relaciones = degree no dirigido.

### ABSTRACTION

#### CONCEPT (204)

- **Abstracción** — `ABSTRACTION` / `CONCEPT`; slug `abstraccion`; fechas —; relaciones 10; aliases: —.
- **Academia** — `ABSTRACTION` / `CONCEPT`; slug `academia`; fechas —; relaciones 1; aliases: —.
- **Accesibilidad** — `ABSTRACTION` / `CONCEPT`; slug `accesibilidad`; fechas —; relaciones 1; aliases: —.
- **Acero** — `ABSTRACTION` / `CONCEPT`; slug `acero`; fechas —; relaciones 5; aliases: —.
- **Activismo** — `ABSTRACTION` / `CONCEPT`; slug `activismo`; fechas —; relaciones 1; aliases: —.
- **Acuarela** — `ABSTRACTION` / `CONCEPT`; slug `acuarela`; fechas —; relaciones 3; aliases: —.
- **Agua** — `ABSTRACTION` / `CONCEPT`; slug `agua`; fechas —; relaciones 1; aliases: —.
- **Agua y política** — `ABSTRACTION` / `CONCEPT`; slug `agua-politica`; fechas —; relaciones 1; aliases: —.
- **Aguafuerte** — `ABSTRACTION` / `CONCEPT`; slug `aguafuerte`; fechas —; relaciones 3; aliases: —.
- **Aire** — `ABSTRACTION` / `CONCEPT`; slug `aire`; fechas —; relaciones 1; aliases: —.
- **Alegoría** — `ABSTRACTION` / `CONCEPT`; slug `alegoria`; fechas —; relaciones 1; aliases: —.
- **Animal** — `ABSTRACTION` / `CONCEPT`; slug `animal`; fechas —; relaciones 1; aliases: —.
- **Archivo** — `ABSTRACTION` / `CONCEPT`; slug `archivo`; fechas —; relaciones 3; aliases: —.
- **Archivo vivo** — `ABSTRACTION` / `CONCEPT`; slug `archivo-vivo`; fechas —; relaciones 1; aliases: —.
- **Arquitectura** — `ABSTRACTION` / `CONCEPT`; slug `arquitectura`; fechas —; relaciones 14; aliases: —.
- **Arquitectura doméstica** — `ABSTRACTION` / `CONCEPT`; slug `arquitectura-domestica`; fechas —; relaciones 1; aliases: —.
- **Artesanía** — `ABSTRACTION` / `CONCEPT`; slug `artesania`; fechas —; relaciones 2; aliases: —.
- **Autorretrato** — `ABSTRACTION` / `CONCEPT`; slug `autorretrato`; fechas —; relaciones 3; aliases: —.
- **Autoría** — `ABSTRACTION` / `CONCEPT`; slug `autoria`; fechas —; relaciones 18; aliases: —.
- **Belleza** — `ABSTRACTION` / `CONCEPT`; slug `belleza`; fechas —; relaciones 4; aliases: —.
- **Bronce** — `ABSTRACTION` / `CONCEPT`; slug `bronce`; fechas —; relaciones 3; aliases: —.
- **Canon** — `ABSTRACTION` / `CONCEPT`; slug `canon`; fechas —; relaciones 1; aliases: —.
- **Censura** — `ABSTRACTION` / `CONCEPT`; slug `censura`; fechas —; relaciones 1; aliases: —.
- **Cerámica** — `ABSTRACTION` / `CONCEPT`; slug `ceramica`; fechas —; relaciones 1; aliases: —.
- **Cine** — `ABSTRACTION` / `CONCEPT`; slug `cine`; fechas —; relaciones 3; aliases: —.
- **Ciudad** — `ABSTRACTION` / `CONCEPT`; slug `ciudad`; fechas —; relaciones 40; aliases: —.
- **Claroscuro** — `ABSTRACTION` / `CONCEPT`; slug `claroscuro`; fechas —; relaciones 1; aliases: —.
- **Clase social** — `ABSTRACTION` / `CONCEPT`; slug `clase-social`; fechas —; relaciones 3; aliases: —.
- **Clima** — `ABSTRACTION` / `CONCEPT`; slug `clima`; fechas —; relaciones 1; aliases: —.
- **Collage** — `ABSTRACTION` / `CONCEPT`; slug `collage`; fechas —; relaciones 3; aliases: —.
- **Colonialismo** — `ABSTRACTION` / `CONCEPT`; slug `colonialismo`; fechas —; relaciones 3; aliases: —.
- **Color** — `ABSTRACTION` / `CONCEPT`; slug `color`; fechas —; relaciones 3; aliases: —.
- **Comunidad** — `ABSTRACTION` / `CONCEPT`; slug `comunidad`; fechas —; relaciones 3; aliases: —.
- **Conservación** — `ABSTRACTION` / `CONCEPT`; slug `conservacion`; fechas —; relaciones 1; aliases: —.
- **Consumo** — `ABSTRACTION` / `CONCEPT`; slug `consumo`; fechas —; relaciones 2; aliases: —.
- **Cuerpo** — `ABSTRACTION` / `CONCEPT`; slug `cuerpo`; fechas —; relaciones 19; aliases: —.
- **Cuerpo político** — `ABSTRACTION` / `CONCEPT`; slug `cuerpo-politico`; fechas —; relaciones 1; aliases: —.
- **Cuidado** — `ABSTRACTION` / `CONCEPT`; slug `cuidado`; fechas —; relaciones 3; aliases: —.
- **Cultura popular** — `ABSTRACTION` / `CONCEPT`; slug `cultura-popular`; fechas —; relaciones 1; aliases: —.
- **Danza** — `ABSTRACTION` / `CONCEPT`; slug `danza`; fechas —; relaciones 1; aliases: —.
- **Derechos culturales** — `ABSTRACTION` / `CONCEPT`; slug `derechos-culturales`; fechas —; relaciones 1; aliases: —.
- **Deseo** — `ABSTRACTION` / `CONCEPT`; slug `deseo`; fechas —; relaciones 3; aliases: —.
- **Desnudo** — `ABSTRACTION` / `CONCEPT`; slug `desnudo`; fechas —; relaciones 3; aliases: —.
- **Dibujo** — `ABSTRACTION` / `CONCEPT`; slug `dibujo`; fechas —; relaciones 3; aliases: —.
- **Digital** — `ABSTRACTION` / `CONCEPT`; slug `digital`; fechas —; relaciones 1; aliases: —.
- **Discapacidad** — `ABSTRACTION` / `CONCEPT`; slug `discapacidad`; fechas —; relaciones 1; aliases: —.
- **Diseño gráfico** — `ABSTRACTION` / `CONCEPT`; slug `diseno-grafico`; fechas —; relaciones 1; aliases: —.
- **Distopía** — `ABSTRACTION` / `CONCEPT`; slug `distopia`; fechas —; relaciones 1; aliases: —.
- **Diáspora** — `ABSTRACTION` / `CONCEPT`; slug `diaspora`; fechas —; relaciones 3; aliases: —.
- **Domesticidad** — `ABSTRACTION` / `CONCEPT`; slug `domesticidad`; fechas —; relaciones 3; aliases: —.
- **Duelo** — `ABSTRACTION` / `CONCEPT`; slug `duelo`; fechas —; relaciones 1; aliases: —.
- **Ecología** — `ABSTRACTION` / `CONCEPT`; slug `ecologia`; fechas —; relaciones 3; aliases: —.
- **Educación** — `ABSTRACTION` / `CONCEPT`; slug `educacion`; fechas —; relaciones 3; aliases: —.
- **Ensamblaje** — `ABSTRACTION` / `CONCEPT`; slug `ensamblaje`; fechas —; relaciones 3; aliases: —.
- **Escala** — `ABSTRACTION` / `CONCEPT`; slug `escala`; fechas —; relaciones 1; aliases: —.
- **Esclavitud** — `ABSTRACTION` / `CONCEPT`; slug `esclavitud`; fechas —; relaciones 3; aliases: —.
- **Escuela** — `ABSTRACTION` / `CONCEPT`; slug `escuela`; fechas —; relaciones 1; aliases: —.
- **Espacio** — `ABSTRACTION` / `CONCEPT`; slug `espacio`; fechas —; relaciones 1; aliases: —.
- **Espacio público** — `ABSTRACTION` / `CONCEPT`; slug `espacio-publico`; fechas —; relaciones 15; aliases: —.
- **Espectáculo** — `ABSTRACTION` / `CONCEPT`; slug `espectaculo`; fechas —; relaciones 3; aliases: —.
- **Esperanza** — `ABSTRACTION` / `CONCEPT`; slug `esperanza`; fechas —; relaciones 1; aliases: —.
- **Exilio** — `ABSTRACTION` / `CONCEPT`; slug `exilio`; fechas —; relaciones 3; aliases: —.
- **Exposición** — `ABSTRACTION` / `CONCEPT`; slug `exposicion`; fechas —; relaciones 1; aliases: —.
- **Feminismo** — `ABSTRACTION` / `CONCEPT`; slug `feminismo`; fechas —; relaciones 1; aliases: —.
- **Folclore** — `ABSTRACTION` / `CONCEPT`; slug `folclore`; fechas —; relaciones 1; aliases: —.
- **Forma** — `ABSTRACTION` / `CONCEPT`; slug `forma`; fechas —; relaciones 3; aliases: —.
- **Fotografía** — `ABSTRACTION` / `CONCEPT`; slug `fotografia`; fechas —; relaciones 28; aliases: —.
- **Fragmento** — `ABSTRACTION` / `CONCEPT`; slug `fragmento`; fechas —; relaciones 1; aliases: —.
- **Fresco** — `ABSTRACTION` / `CONCEPT`; slug `fresco`; fechas —; relaciones 3; aliases: —.
- **Frontera** — `ABSTRACTION` / `CONCEPT`; slug `frontera`; fechas —; relaciones 1; aliases: —.
- **Frontera colonial** — `ABSTRACTION` / `CONCEPT`; slug `frontera-colonial`; fechas —; relaciones 1; aliases: —.
- **Fuego** — `ABSTRACTION` / `CONCEPT`; slug `fuego`; fechas —; relaciones 1; aliases: —.
- **Fundición** — `ABSTRACTION` / `CONCEPT`; slug `fundicion`; fechas —; relaciones 3; aliases: —.
- **Globalización** — `ABSTRACTION` / `CONCEPT`; slug `globalizacion`; fechas —; relaciones 1; aliases: —.
- **Grabado** — `ABSTRACTION` / `CONCEPT`; slug `grabado`; fechas —; relaciones 3; aliases: —.
- **Guerra** — `ABSTRACTION` / `CONCEPT`; slug `guerra`; fechas —; relaciones 11; aliases: —.
- **Género** — `ABSTRACTION` / `CONCEPT`; slug `genero`; fechas —; relaciones 3; aliases: —.
- **Hormigón** — `ABSTRACTION` / `CONCEPT`; slug `hormigon`; fechas —; relaciones 5; aliases: —.
- **Huella** — `ABSTRACTION` / `CONCEPT`; slug `huella`; fechas —; relaciones 1; aliases: —.
- **Icono** — `ABSTRACTION` / `CONCEPT`; slug `icono`; fechas —; relaciones 1; aliases: —.
- **Iconografía** — `ABSTRACTION` / `CONCEPT`; slug `iconografia`; fechas —; relaciones 3; aliases: —.
- **Identidad** — `ABSTRACTION` / `CONCEPT`; slug `identidad`; fechas —; relaciones 4; aliases: —.
- **Imperio** — `ABSTRACTION` / `CONCEPT`; slug `imperio`; fechas —; relaciones 4; aliases: —.
- **Inconsciente** — `ABSTRACTION` / `CONCEPT`; slug `inconsciente`; fechas —; relaciones 3; aliases: —.
- **Industria** — `ABSTRACTION` / `CONCEPT`; slug `industria`; fechas —; relaciones 1; aliases: —.
- **Instalación** — `ABSTRACTION` / `CONCEPT`; slug `instalacion`; fechas —; relaciones 3; aliases: —.
- **Inteligencia artificial** — `ABSTRACTION` / `CONCEPT`; slug `inteligencia-artificial`; fechas —; relaciones 1; aliases: —.
- **Interactividad** — `ABSTRACTION` / `CONCEPT`; slug `interactividad`; fechas —; relaciones 1; aliases: —.
- **Joyería** — `ABSTRACTION` / `CONCEPT`; slug `joyeria`; fechas —; relaciones 1; aliases: —.
- **Lenguaje** — `ABSTRACTION` / `CONCEPT`; slug `lenguaje`; fechas —; relaciones 1; aliases: —.
- **Lienzo** — `ABSTRACTION` / `CONCEPT`; slug `lienzo`; fechas —; relaciones 26; aliases: —.
- **Litografía** — `ABSTRACTION` / `CONCEPT`; slug `litografia`; fechas —; relaciones 3; aliases: —.
- **Lujo** — `ABSTRACTION` / `CONCEPT`; slug `lujo`; fechas —; relaciones 4; aliases: —.
- **Luz** — `ABSTRACTION` / `CONCEPT`; slug `luz`; fechas —; relaciones 1; aliases: —.
- **Línea** — `ABSTRACTION` / `CONCEPT`; slug `linea`; fechas —; relaciones 1; aliases: —.
- **Madera** — `ABSTRACTION` / `CONCEPT`; slug `madera`; fechas —; relaciones 3; aliases: —.
- **Manuscrito** — `ABSTRACTION` / `CONCEPT`; slug `manuscrito`; fechas —; relaciones 2; aliases: —.
- **Materialidad** — `ABSTRACTION` / `CONCEPT`; slug `materialidad`; fechas —; relaciones 28; aliases: —.
- **Medios de masas** — `ABSTRACTION` / `CONCEPT`; slug `medios-de-masas`; fechas —; relaciones 1; aliases: —.
- **Melancolía** — `ABSTRACTION` / `CONCEPT`; slug `melancolia`; fechas —; relaciones 3; aliases: —.
- **Memoria** — `ABSTRACTION` / `CONCEPT`; slug `memoria`; fechas —; relaciones 12; aliases: —.
- **Mercado del arte** — `ABSTRACTION` / `CONCEPT`; slug `mercado-del-arte`; fechas —; relaciones 1; aliases: —.
- **Migración** — `ABSTRACTION` / `CONCEPT`; slug `migracion`; fechas —; relaciones 3; aliases: —.
- **Mirada** — `ABSTRACTION` / `CONCEPT`; slug `mirada`; fechas —; relaciones 3; aliases: —.
- **Mito** — `ABSTRACTION` / `CONCEPT`; slug `mito`; fechas —; relaciones 18; aliases: —.
- **Moda** — `ABSTRACTION` / `CONCEPT`; slug `moda`; fechas —; relaciones 1; aliases: —.
- **Modernidad** — `ABSTRACTION` / `CONCEPT`; slug `modernidad`; fechas —; relaciones 4; aliases: —.
- **Monstruo** — `ABSTRACTION` / `CONCEPT`; slug `monstruo`; fechas —; relaciones 1; aliases: —.
- **Monumento** — `ABSTRACTION` / `CONCEPT`; slug `monumento`; fechas —; relaciones 3; aliases: —.
- **Muerte** — `ABSTRACTION` / `CONCEPT`; slug `muerte`; fechas —; relaciones 3; aliases: —.
- **Mural** — `ABSTRACTION` / `CONCEPT`; slug `mural`; fechas —; relaciones 3; aliases: —.
- **Museo** — `ABSTRACTION` / `CONCEPT`; slug `museo`; fechas —; relaciones 1; aliases: —.
- **Museología** — `ABSTRACTION` / `CONCEPT`; slug `museologia`; fechas —; relaciones 1; aliases: —.
- **Máquina** — `ABSTRACTION` / `CONCEPT`; slug `maquina`; fechas —; relaciones 4; aliases: —.
- **Mármol** — `ABSTRACTION` / `CONCEPT`; slug `marmol`; fechas —; relaciones 16; aliases: —.
- **Música** — `ABSTRACTION` / `CONCEPT`; slug `musica`; fechas —; relaciones 1; aliases: —.
- **Nación** — `ABSTRACTION` / `CONCEPT`; slug `nacion`; fechas —; relaciones 1; aliases: —.
- **Naturaleza** — `ABSTRACTION` / `CONCEPT`; slug `naturaleza`; fechas —; relaciones 18; aliases: —.
- **Naturaleza muerta** — `ABSTRACTION` / `CONCEPT`; slug `naturaleza-muerta`; fechas —; relaciones 3; aliases: —.
- **Originalidad** — `ABSTRACTION` / `CONCEPT`; slug `originalidad`; fechas —; relaciones 3; aliases: —.
- **Ornamento** — `ABSTRACTION` / `CONCEPT`; slug `ornamento`; fechas —; relaciones 3; aliases: —.
- **Oro** — `ABSTRACTION` / `CONCEPT`; slug `oro`; fechas —; relaciones 3; aliases: —.
- **Paisaje** — `ABSTRACTION` / `CONCEPT`; slug `paisaje`; fechas —; relaciones 17; aliases: —.
- **Paisaje rural** — `ABSTRACTION` / `CONCEPT`; slug `paisaje-rural`; fechas —; relaciones 1; aliases: —.
- **Paisaje urbano** — `ABSTRACTION` / `CONCEPT`; slug `paisaje-urbano`; fechas —; relaciones 1; aliases: —.
- **Papel** — `ABSTRACTION` / `CONCEPT`; slug `papel`; fechas —; relaciones 6; aliases: —.
- **Participación** — `ABSTRACTION` / `CONCEPT`; slug `participacion`; fechas —; relaciones 1; aliases: —.
- **Patrimonio** — `ABSTRACTION` / `CONCEPT`; slug `patrimonio`; fechas —; relaciones 1; aliases: —.
- **Patrimonio inmaterial** — `ABSTRACTION` / `CONCEPT`; slug `patrimonio-inmaterial`; fechas —; relaciones 1; aliases: —.
- **Película fotográfica** — `ABSTRACTION` / `CONCEPT`; slug `pelicula-fotografica`; fechas —; relaciones 12; aliases: —.
- **Performance** — `ABSTRACTION` / `CONCEPT`; slug `performance`; fechas —; relaciones 5; aliases: —.
- **Perspectiva** — `ABSTRACTION` / `CONCEPT`; slug `perspectiva`; fechas —; relaciones 4; aliases: —.
- **Perspectiva aérea** — `ABSTRACTION` / `CONCEPT`; slug `perspectiva-aerea`; fechas —; relaciones 1; aliases: —.
- **Perspectiva lineal** — `ABSTRACTION` / `CONCEPT`; slug `perspectiva-lineal`; fechas —; relaciones 3; aliases: —.
- **Pigmento** — `ABSTRACTION` / `CONCEPT`; slug `pigmento`; fechas —; relaciones 3; aliases: —.
- **Pintura al óleo** — `ABSTRACTION` / `CONCEPT`; slug `pintura-al-oleo`; fechas —; relaciones 26; aliases: —.
- **Pintura de historia** — `ABSTRACTION` / `CONCEPT`; slug `pintura-de-historia`; fechas —; relaciones 3; aliases: —.
- **Pintura religiosa** — `ABSTRACTION` / `CONCEPT`; slug `pintura-religiosa`; fechas —; relaciones 3; aliases: —.
- **Planta** — `ABSTRACTION` / `CONCEPT`; slug `planta`; fechas —; relaciones 1; aliases: —.
- **Poder** — `ABSTRACTION` / `CONCEPT`; slug `poder`; fechas —; relaciones 6; aliases: —.
- **Poesía** — `ABSTRACTION` / `CONCEPT`; slug `poesia`; fechas —; relaciones 1; aliases: —.
- **Posmodernidad** — `ABSTRACTION` / `CONCEPT`; slug `posmodernidad`; fechas —; relaciones 1; aliases: —.
- **Profano** — `ABSTRACTION` / `CONCEPT`; slug `profano`; fechas —; relaciones 1; aliases: —.
- **Propaganda** — `ABSTRACTION` / `CONCEPT`; slug `propaganda`; fechas —; relaciones 3; aliases: —.
- **Propiedad** — `ABSTRACTION` / `CONCEPT`; slug `propiedad`; fechas —; relaciones 1; aliases: —.
- **Proporción** — `ABSTRACTION` / `CONCEPT`; slug `proporcion`; fechas —; relaciones 1; aliases: —.
- **Publicidad** — `ABSTRACTION` / `CONCEPT`; slug `publicidad`; fechas —; relaciones 1; aliases: —.
- **Pueblo** — `ABSTRACTION` / `CONCEPT`; slug `pueblo`; fechas —; relaciones 1; aliases: —.
- **Queer** — `ABSTRACTION` / `CONCEPT`; slug `queer`; fechas —; relaciones 1; aliases: —.
- **Raza** — `ABSTRACTION` / `CONCEPT`; slug `raza`; fechas —; relaciones 3; aliases: —.
- **Realidad virtual** — `ABSTRACTION` / `CONCEPT`; slug `realidad-virtual`; fechas —; relaciones 1; aliases: —.
- **Red** — `ABSTRACTION` / `CONCEPT`; slug `red`; fechas —; relaciones 1; aliases: —.
- **Religión** — `ABSTRACTION` / `CONCEPT`; slug `religion`; fechas —; relaciones 28; aliases: —.
- **Repatriación** — `ABSTRACTION` / `CONCEPT`; slug `repatriacion`; fechas —; relaciones 1; aliases: —.
- **Representación** — `ABSTRACTION` / `CONCEPT`; slug `representacion`; fechas —; relaciones 218; aliases: —.
- **Reproducción** — `ABSTRACTION` / `CONCEPT`; slug `reproduccion`; fechas —; relaciones 17; aliases: —.
- **Restauración** — `ABSTRACTION` / `CONCEPT`; slug `restauracion`; fechas —; relaciones 1; aliases: —.
- **Restitución** — `ABSTRACTION` / `CONCEPT`; slug `restitucion`; fechas —; relaciones 1; aliases: —.
- **Retrato** — `ABSTRACTION` / `CONCEPT`; slug `retrato`; fechas —; relaciones 17; aliases: —.
- **Revolución** — `ABSTRACTION` / `CONCEPT`; slug `revolucion`; fechas —; relaciones 4; aliases: —.
- **Revolución industrial** — `ABSTRACTION` / `CONCEPT`; slug `revolucion-industrial`; fechas —; relaciones 3; aliases: —.
- **Ritmo** — `ABSTRACTION` / `CONCEPT`; slug `ritmo`; fechas —; relaciones 1; aliases: —.
- **Ritual** — `ABSTRACTION` / `CONCEPT`; slug `ritual`; fechas —; relaciones 7; aliases: —.
- **Ruina** — `ABSTRACTION` / `CONCEPT`; slug `ruina`; fechas —; relaciones 1; aliases: —.
- **Sagrado** — `ABSTRACTION` / `CONCEPT`; slug `sagrado`; fechas —; relaciones 1; aliases: —.
- **Secularización** — `ABSTRACTION` / `CONCEPT`; slug `secularizacion`; fechas —; relaciones 1; aliases: —.
- **Serigrafía** — `ABSTRACTION` / `CONCEPT`; slug `serigrafia`; fechas —; relaciones 3; aliases: —.
- **Sexualidad** — `ABSTRACTION` / `CONCEPT`; slug `sexualidad`; fechas —; relaciones 3; aliases: —.
- **Sfumato** — `ABSTRACTION` / `CONCEPT`; slug `sfumato`; fechas —; relaciones 1; aliases: —.
- **Simetría** — `ABSTRACTION` / `CONCEPT`; slug `simetria`; fechas —; relaciones 1; aliases: —.
- **Sombra** — `ABSTRACTION` / `CONCEPT`; slug `sombra`; fechas —; relaciones 1; aliases: —.
- **Sonido** — `ABSTRACTION` / `CONCEPT`; slug `sonido`; fechas —; relaciones 1; aliases: —.
- **Sostenibilidad** — `ABSTRACTION` / `CONCEPT`; slug `sostenibilidad`; fechas —; relaciones 1; aliases: —.
- **Sostenibilidad urbana** — `ABSTRACTION` / `CONCEPT`; slug `sostenibilidad-urbana`; fechas —; relaciones 1; aliases: —.
- **Sublime** — `ABSTRACTION` / `CONCEPT`; slug `sublime`; fechas —; relaciones 3; aliases: —.
- **Sueño** — `ABSTRACTION` / `CONCEPT`; slug `sueno`; fechas —; relaciones 2; aliases: —.
- **Talla** — `ABSTRACTION` / `CONCEPT`; slug `talla`; fechas —; relaciones 10; aliases: —.
- **Taller** — `ABSTRACTION` / `CONCEPT`; slug `taller`; fechas —; relaciones 1; aliases: —.
- **Teatro** — `ABSTRACTION` / `CONCEPT`; slug `teatro`; fechas —; relaciones 1; aliases: —.
- **Tecnología** — `ABSTRACTION` / `CONCEPT`; slug `tecnologia`; fechas —; relaciones 6; aliases: —.
- **Tenebrism** — `ABSTRACTION` / `CONCEPT`; slug `tenebrismo`; fechas —; relaciones 1; aliases: —.
- **Territorio** — `ABSTRACTION` / `CONCEPT`; slug `territorio`; fechas —; relaciones 1; aliases: —.
- **Testimonio** — `ABSTRACTION` / `CONCEPT`; slug `testimonio`; fechas —; relaciones 1; aliases: —.
- **Textil** — `ABSTRACTION` / `CONCEPT`; slug `textil`; fechas —; relaciones 1; aliases: —.
- **Textura** — `ABSTRACTION` / `CONCEPT`; slug `textura`; fechas —; relaciones 1; aliases: —.
- **Tiempo** — `ABSTRACTION` / `CONCEPT`; slug `tiempo`; fechas —; relaciones 3; aliases: —.
- **Tierra** — `ABSTRACTION` / `CONCEPT`; slug `tierra`; fechas —; relaciones 1; aliases: —.
- **Tipografía** — `ABSTRACTION` / `CONCEPT`; slug `tipografia`; fechas —; relaciones 1; aliases: —.
- **Trabajador** — `ABSTRACTION` / `CONCEPT`; slug `trabajador`; fechas —; relaciones 1; aliases: —.
- **Trabajo** — `ABSTRACTION` / `CONCEPT`; slug `trabajo`; fechas —; relaciones 4; aliases: —.
- **Trabajo industrial** — `ABSTRACTION` / `CONCEPT`; slug `trabajo-industrial`; fechas —; relaciones 3; aliases: —.
- **Tradición** — `ABSTRACTION` / `CONCEPT`; slug `tradicion`; fechas —; relaciones 4; aliases: —.
- **Traducción** — `ABSTRACTION` / `CONCEPT`; slug `traduccion`; fechas —; relaciones 1; aliases: —.
- **Trauma** — `ABSTRACTION` / `CONCEPT`; slug `trauma`; fechas —; relaciones 1; aliases: —.
- **Turismo cultural** — `ABSTRACTION` / `CONCEPT`; slug `turismo-cultural`; fechas —; relaciones 1; aliases: —.
- **Técnicas de reproducción** — `ABSTRACTION` / `CONCEPT`; slug `tecnicas-de-reproduccion`; fechas —; relaciones 1; aliases: —.
- **Témpera** — `ABSTRACTION` / `CONCEPT`; slug `temple`; fechas —; relaciones 2; aliases: —.
- **Utopía** — `ABSTRACTION` / `CONCEPT`; slug `utopia`; fechas —; relaciones 1; aliases: —.
- **Vanguardia** — `ABSTRACTION` / `CONCEPT`; slug `vanguardia`; fechas —; relaciones 1; aliases: —.
- **Vida** — `ABSTRACTION` / `CONCEPT`; slug `vida`; fechas —; relaciones 3; aliases: —.
- **Vidrio** — `ABSTRACTION` / `CONCEPT`; slug `vidrio`; fechas —; relaciones 3; aliases: —.
- **Violencia** — `ABSTRACTION` / `CONCEPT`; slug `violencia`; fechas —; relaciones 11; aliases: —.
- **Vídeo** — `ABSTRACTION` / `CONCEPT`; slug `video`; fechas —; relaciones 1; aliases: —.
- **Xilografía** — `ABSTRACTION` / `CONCEPT`; slug `xilografia`; fechas —; relaciones 6; aliases: —.

#### MOVEMENT (52)

- **Arquitectura moderna** — `ABSTRACTION` / `MOVEMENT`; slug `arquitectura-moderna`; fechas —; relaciones 12; aliases: —.
- **Art Nouveau** — `ABSTRACTION` / `MOVEMENT`; slug `art-nouveau`; fechas —; relaciones 8; aliases: —.
- **Arte africano** — `ABSTRACTION` / `MOVEMENT`; slug `arte-africano`; fechas —; relaciones 15; aliases: —.
- **Arte andino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-andino`; fechas —; relaciones 4; aliases: —.
- **Arte bizantino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-bizantino`; fechas —; relaciones 6; aliases: —.
- **Arte chino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-chino`; fechas —; relaciones 5; aliases: —.
- **Arte conceptual** — `ABSTRACTION` / `MOVEMENT`; slug `arte-conceptual`; fechas —; relaciones 57; aliases: —.
- **Arte de performance** — `ABSTRACTION` / `MOVEMENT`; slug `arte-performance`; fechas —; relaciones 3; aliases: —.
- **Arte egipcio** — `ABSTRACTION` / `MOVEMENT`; slug `arte-egipcio`; fechas —; relaciones 4; aliases: —.
- **Arte griego** — `ABSTRACTION` / `MOVEMENT`; slug `arte-griego`; fechas —; relaciones 14; aliases: —.
- **Arte indio** — `ABSTRACTION` / `MOVEMENT`; slug `arte-indio`; fechas —; relaciones 11; aliases: —.
- **Arte islámico** — `ABSTRACTION` / `MOVEMENT`; slug `arte-islamico`; fechas —; relaciones 7; aliases: —.
- **Arte maya** — `ABSTRACTION` / `MOVEMENT`; slug `arte-maya`; fechas —; relaciones 3; aliases: —.
- **Arte mesopotámico** — `ABSTRACTION` / `MOVEMENT`; slug `arte-mesopotamico`; fechas —; relaciones 5; aliases: —.
- **Arte mexica** — `ABSTRACTION` / `MOVEMENT`; slug `arte-mexica`; fechas —; relaciones 5; aliases: —.
- **Arte romano** — `ABSTRACTION` / `MOVEMENT`; slug `arte-romano`; fechas —; relaciones 10; aliases: —.
- **Arte rupestre** — `ABSTRACTION` / `MOVEMENT`; slug `arte-rupestre`; fechas —; relaciones 4; aliases: —.
- **Arts and Crafts** — `ABSTRACTION` / `MOVEMENT`; slug `arts-and-crafts`; fechas —; relaciones 5; aliases: —.
- **Barroco** — `ABSTRACTION` / `MOVEMENT`; slug `barroco`; fechas —; relaciones 27; aliases: —.
- **Bauhaus** — `ABSTRACTION` / `MOVEMENT`; slug `bauhaus-movement`; fechas —; relaciones 17; aliases: —.
- **Constructivismo** — `ABSTRACTION` / `MOVEMENT`; slug `constructivismo`; fechas —; relaciones 10; aliases: —.
- **Cubismo** — `ABSTRACTION` / `MOVEMENT`; slug `cubismo`; fechas —; relaciones 13; aliases: —.
- **Dadaísmo** — `ABSTRACTION` / `MOVEMENT`; slug `dadaismo`; fechas —; relaciones 20; aliases: —.
- **De Stijl** — `ABSTRACTION` / `MOVEMENT`; slug `de-stijl`; fechas —; relaciones 4; aliases: —.
- **Expresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `expresionismo`; fechas —; relaciones 7; aliases: —.
- **Expresionismo abstracto** — `ABSTRACTION` / `MOVEMENT`; slug `expresionismo-abstracto`; fechas —; relaciones 15; aliases: —.
- **Fauvismo** — `ABSTRACTION` / `MOVEMENT`; slug `fauvismo`; fechas —; relaciones 5; aliases: —.
- **Fluxus** — `ABSTRACTION` / `MOVEMENT`; slug `fluxus`; fechas —; relaciones 4; aliases: —.
- **Fotografía moderna** — `ABSTRACTION` / `MOVEMENT`; slug `fotografia-moderna`; fechas —; relaciones 10; aliases: —.
- **Futurismo** — `ABSTRACTION` / `MOVEMENT`; slug `futurismo`; fechas —; relaciones 7; aliases: —.
- **Gótico** — `ABSTRACTION` / `MOVEMENT`; slug `gotico`; fechas —; relaciones 5; aliases: —.
- **Impresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `impresionismo`; fechas —; relaciones 18; aliases: —.
- **Informalismo** — `ABSTRACTION` / `MOVEMENT`; slug `informalismo`; fechas —; relaciones 4; aliases: —.
- **Land Art** — `ABSTRACTION` / `MOVEMENT`; slug `land-art`; fechas —; relaciones 4; aliases: —.
- **Manierismo** — `ABSTRACTION` / `MOVEMENT`; slug `manierismo`; fechas —; relaciones 8; aliases: —.
- **Minimalismo** — `ABSTRACTION` / `MOVEMENT`; slug `minimalismo`; fechas —; relaciones 17; aliases: —.
- **Modernismo brasileño** — `ABSTRACTION` / `MOVEMENT`; slug `modernismo-brasileno`; fechas —; relaciones 1; aliases: —.
- **Muralismo mexicano** — `ABSTRACTION` / `MOVEMENT`; slug `muralismo-mexicano`; fechas —; relaciones 13; aliases: —.
- **Neoclasicismo** — `ABSTRACTION` / `MOVEMENT`; slug `neoclasicismo`; fechas —; relaciones 13; aliases: —.
- **Orfismo** — `ABSTRACTION` / `MOVEMENT`; slug `orfismo`; fechas —; relaciones 4; aliases: —.
- **Pop Art** — `ABSTRACTION` / `MOVEMENT`; slug `pop-art`; fechas —; relaciones 12; aliases: —.
- **Postimpresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `postimpresionismo`; fechas —; relaciones 18; aliases: —.
- **Realismo** — `ABSTRACTION` / `MOVEMENT`; slug `realismo`; fechas —; relaciones 23; aliases: —.
- **Renacimiento italiano** — `ABSTRACTION` / `MOVEMENT`; slug `renacimiento-italiano`; fechas —; relaciones 28; aliases: —.
- **Renacimiento nórdico** — `ABSTRACTION` / `MOVEMENT`; slug `renacimiento-nordico`; fechas —; relaciones 8; aliases: —.
- **Rococo** — `ABSTRACTION` / `MOVEMENT`; slug `rococo`; fechas —; relaciones 12; aliases: —.
- **Romanticismo** — `ABSTRACTION` / `MOVEMENT`; slug `romanticismo`; fechas —; relaciones 19; aliases: —.
- **Románico** — `ABSTRACTION` / `MOVEMENT`; slug `romanico`; fechas —; relaciones 3; aliases: —.
- **Simbolismo** — `ABSTRACTION` / `MOVEMENT`; slug `simbolismo`; fechas —; relaciones 8; aliases: —.
- **Suprematismo** — `ABSTRACTION` / `MOVEMENT`; slug `suprematismo`; fechas —; relaciones 6; aliases: —.
- **Surrealismo** — `ABSTRACTION` / `MOVEMENT`; slug `surrealismo`; fechas —; relaciones 22; aliases: —.
- **Ukiyo-e** — `ABSTRACTION` / `MOVEMENT`; slug `ukiyo-e`; fechas —; relaciones 8; aliases: —.

#### PERIOD (9)

- **Antigüedad** — `ABSTRACTION` / `PERIOD`; slug `antiguedad`; fechas -3500–500; relaciones 52; aliases: —.
- **Edad Media** — `ABSTRACTION` / `PERIOD`; slug `edad-media`; fechas 500–1400; relaciones 13; aliases: —.
- **Edad Moderna** — `ABSTRACTION` / `PERIOD`; slug `edad-moderna`; fechas 1500–1800; relaciones 42; aliases: —.
- **Neolítico** — `ABSTRACTION` / `PERIOD`; slug `neolitico`; fechas -10000–-3000; relaciones 1; aliases: —.
- **Paleolítico** — `ABSTRACTION` / `PERIOD`; slug `paleolitico`; fechas -3000000–-10000; relaciones 3; aliases: —.
- **Renacimiento** — `ABSTRACTION` / `PERIOD`; slug `renacimiento`; fechas 1400–1600; relaciones 31; aliases: —.
- **Siglo XIX** — `ABSTRACTION` / `PERIOD`; slug `siglo-xix`; fechas 1801–1900; relaciones 92; aliases: —.
- **Siglo XX** — `ABSTRACTION` / `PERIOD`; slug `siglo-xx`; fechas 1901–2000; relaciones 213; aliases: —.
- **Siglo XXI** — `ABSTRACTION` / `PERIOD`; slug `siglo-xxi`; fechas 2001–…; relaciones 1; aliases: —.

### EVENT

#### EVENT (6)

- **Armory Show** — `EVENT` / `EVENT`; slug `exposicion-armory-show`; fechas 1913–…; relaciones 3; aliases: —.
- **Guerra civil española** — `EVENT` / `EVENT`; slug `guerra-civil-espanola`; fechas 1936–1939; relaciones 2; aliases: —.
- **Primera Guerra Mundial** — `EVENT` / `EVENT`; slug `primera-guerra-mundial`; fechas 1914–1918; relaciones 2; aliases: —.
- **Revolución francesa** — `EVENT` / `EVENT`; slug `revolucion-francesa`; fechas 1789–1799; relaciones 4; aliases: —.
- **Revolución rusa** — `EVENT` / `EVENT`; slug `revolucion-rusa`; fechas 1917–…; relaciones 2; aliases: —.
- **Segunda Guerra Mundial** — `EVENT` / `EVENT`; slug `segunda-guerra-mundial`; fechas 1939–1945; relaciones 3; aliases: —.

### ORGANIZATION

#### ORGANIZATION (18)

- **Académie des Beaux-Arts** — `ORGANIZATION` / `ORGANIZATION`; slug `academie-des-beaux-arts`; fechas —; relaciones 2; aliases: —.
- **Black Mountain College** — `ORGANIZATION` / `ORGANIZATION`; slug `black-mountain-college`; fechas —; relaciones 2; aliases: —.
- **Escuela Bauhaus** — `ORGANIZATION` / `ORGANIZATION`; slug `bauhaus-school`; fechas —; relaciones 2; aliases: —.
- **Escuela de Atenas** — `ORGANIZATION` / `ORGANIZATION`; slug `escuela-de-atenas-institucion`; fechas —; relaciones 2; aliases: —.
- **Galería Uffizi** — `ORGANIZATION` / `ORGANIZATION`; slug `uffizi`; fechas —; relaciones 2; aliases: —.
- **Instituto Warburg** — `ORGANIZATION` / `ORGANIZATION`; slug `instituto-warburg`; fechas —; relaciones 2; aliases: —.
- **Instituto de Arte de Chicago** — `ORGANIZATION` / `ORGANIZATION`; slug `instituto-de-arte-chicago`; fechas —; relaciones 2; aliases: —.
- **Metropolitan Museum of Art** — `ORGANIZATION` / `ORGANIZATION`; slug `metropolitan-museum`; fechas —; relaciones 2; aliases: —.
- **Museo Británico** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-britanico`; fechas —; relaciones 2; aliases: —.
- **Museo Egipcio de El Cairo** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-egipcio-cairo`; fechas —; relaciones 2; aliases: —.
- **Museo Nacional de Antropología** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-nacional-antropologia`; fechas —; relaciones 2; aliases: —.
- **Museo Nacional de Arte** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-nacional-de-arte-mexico`; fechas —; relaciones 2; aliases: —.
- **Museo Reina Sofía** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-reina-sofia`; fechas —; relaciones 2; aliases: —.
- **Museo de Arte Moderno** — `ORGANIZATION` / `ORGANIZATION`; slug `moma`; fechas —; relaciones 2; aliases: MoMA.
- **Museo del Louvre** — `ORGANIZATION` / `ORGANIZATION`; slug `louvre`; fechas —; relaciones 2; aliases: —.
- **Museo del Prado** — `ORGANIZATION` / `ORGANIZATION`; slug `museo-del-prado`; fechas —; relaciones 3; aliases: —.
- **National Gallery** — `ORGANIZATION` / `ORGANIZATION`; slug `national-gallery-london`; fechas —; relaciones 2; aliases: —.
- **Tate Modern** — `ORGANIZATION` / `ORGANIZATION`; slug `tate-modern`; fechas —; relaciones 2; aliases: —.

### PERSON

#### ARTIST (201)

- **Agesandro de Rodas** — `PERSON` / `ARTIST`; slug `agesandro`; fechas -100–-1; relaciones 1; aliases: —.
- **Agnes Martin** — `PERSON` / `ARTIST`; slug `agnes-martin`; fechas 1912–2004; relaciones 4; aliases: —.
- **Agustín de Hipona** — `PERSON` / `ARTIST`; slug `agustin-de-hipona`; fechas 354–430; relaciones 2; aliases: —.
- **Ai Weiwei** — `PERSON` / `ARTIST`; slug `ai-weiwei`; fechas 1957–…; relaciones 6; aliases: —.
- **Albrecht Dürer** — `PERSON` / `ARTIST`; slug `albrecht-durer`; fechas 1471–1528; relaciones 4; aliases: —.
- **Alexander Calder** — `PERSON` / `ARTIST`; slug `alexander-calder`; fechas 1898–1976; relaciones 4; aliases: —.
- **Alfred Sisley** — `PERSON` / `ARTIST`; slug `alfred-sisley`; fechas 1839–1899; relaciones 4; aliases: —.
- **Alfred Stieglitz** — `PERSON` / `ARTIST`; slug `alfred-stieglitz`; fechas 1864–1946; relaciones 4; aliases: —.
- **Alice Neel** — `PERSON` / `ARTIST`; slug `alice-neel`; fechas 1900–1984; relaciones 4; aliases: —.
- **Amar Kanwar** — `PERSON` / `ARTIST`; slug `amara-kanwar`; fechas 1964–…; relaciones 4; aliases: —.
- **Andrea Mantegna** — `PERSON` / `ARTIST`; slug `andrea-mantegna`; fechas 1431–1506; relaciones 4; aliases: —.
- **Andy Warhol** — `PERSON` / `ARTIST`; slug `andy-warhol`; fechas 1928–1987; relaciones 4; aliases: —.
- **Angelica Kauffmann** — `PERSON` / `ARTIST`; slug `angelica-kauffmann`; fechas 1741–1807; relaciones 4; aliases: —.
- **Annibale Carracci** — `PERSON` / `ARTIST`; slug `annibale-carracci`; fechas 1560–1609; relaciones 4; aliases: —.
- **Antemio de Tralles** — `PERSON` / `ARTIST`; slug `antemio-de-tralles`; fechas 474–558; relaciones 1; aliases: —.
- **Antoine Watteau** — `PERSON` / `ARTIST`; slug `antonie-watteau`; fechas 1684–1721; relaciones 4; aliases: —.
- **Antonio Canova** — `PERSON` / `ARTIST`; slug `antonio-canova`; fechas 1757–1822; relaciones 4; aliases: —.
- **Apollodoro de Damasco** — `PERSON` / `ARTIST`; slug `apolodoro-de-damasco`; fechas 50–130; relaciones 1; aliases: —.
- **Aristóteles** — `PERSON` / `ARTIST`; slug `aristoteles`; fechas -384–-322; relaciones 7; aliases: —.
- **Artemisia Gentileschi** — `PERSON` / `ARTIST`; slug `artemisia-gentileschi`; fechas 1593–1656; relaciones 4; aliases: —.
- **Artistas de Djenné** — `PERSON` / `ARTIST`; slug `djenne-artists`; fechas —; relaciones 4; aliases: —.
- **Artistas del Reino de Benín** — `PERSON` / `ARTIST`; slug `benin-bronze-artists`; fechas —; relaciones 4; aliases: —.
- **Auguste Rodin** — `PERSON` / `ARTIST`; slug `auguste-rodin`; fechas 1840–1917; relaciones 4; aliases: —.
- **Bartolomé Esteban Murillo** — `PERSON` / `ARTIST`; slug `bartolome-esteban-murillo`; fechas 1617–1682; relaciones 4; aliases: —.
- **Beatriz González** — `PERSON` / `ARTIST`; slug `beatriz-gonzalez`; fechas 1938–…; relaciones 4; aliases: —.
- **Ben Shahn** — `PERSON` / `ARTIST`; slug `ben-shahn`; fechas 1898–1969; relaciones 4; aliases: —.
- **Berthe Morisot** — `PERSON` / `ARTIST`; slug `berthe-morisot`; fechas 1841–1895; relaciones 4; aliases: —.
- **Bridget Riley** — `PERSON` / `ARTIST`; slug `bridget-riley`; fechas 1931–…; relaciones 4; aliases: —.
- **Calícrates** — `PERSON` / `ARTIST`; slug `calicrates`; fechas -500–-420; relaciones 1; aliases: —.
- **Camille Pissarro** — `PERSON` / `ARTIST`; slug `camille-pissarro`; fechas 1830–1903; relaciones 4; aliases: —.
- **Canaletto** — `PERSON` / `ARTIST`; slug `canaletto`; fechas 1697–1768; relaciones 4; aliases: —.
- **Carlos Cruz-Diez** — `PERSON` / `ARTIST`; slug `carlos-cruz-diez`; fechas 1923–2019; relaciones 4; aliases: —.
- **Carrie Mae Weems** — `PERSON` / `ARTIST`; slug `carrie-mae-weems`; fechas 1953–…; relaciones 3; aliases: —.
- **Caspar David Friedrich** — `PERSON` / `ARTIST`; slug `caspar-david-friedrich`; fechas 1774–1840; relaciones 4; aliases: —.
- **Cildo Meireles** — `PERSON` / `ARTIST`; slug `cildo-meireles`; fechas 1948–…; relaciones 4; aliases: —.
- **Cindy Sherman** — `PERSON` / `ARTIST`; slug `cindy-sherman`; fechas 1954–…; relaciones 4; aliases: —.
- **Claes Oldenburg** — `PERSON` / `ARTIST`; slug `claes-oldenburg`; fechas 1929–2022; relaciones 4; aliases: —.
- **Claude Monet** — `PERSON` / `ARTIST`; slug `claude-monet`; fechas 1840–1926; relaciones 4; aliases: —.
- **Constantin Brâncuși** — `PERSON` / `ARTIST`; slug `constantin-brancusi`; fechas 1876–1957; relaciones 3; aliases: —.
- **Cy Twombly** — `PERSON` / `ARTIST`; slug `cy-twombly`; fechas 1928–2011; relaciones 4; aliases: —.
- **Dan Flavin** — `PERSON` / `ARTIST`; slug `dan-flavin`; fechas 1933–1996; relaciones 4; aliases: —.
- **David Alfaro Siqueiros** — `PERSON` / `ARTIST`; slug `david-alfaro-siqueiros`; fechas 1896–1974; relaciones 4; aliases: —.
- **Diego Rivera** — `PERSON` / `ARTIST`; slug `diego-rivera`; fechas 1886–1957; relaciones 4; aliases: —.
- **Diego Velázquez** — `PERSON` / `ARTIST`; slug `diego-velazquez`; fechas 1599–1660; relaciones 4; aliases: —.
- **Dionisio** — `PERSON` / `ARTIST`; slug `dionisio`; fechas 500–600; relaciones 4; aliases: —.
- **Do Ho Suh** — `PERSON` / `ARTIST`; slug `do-ho-suh`; fechas 1962–…; relaciones 4; aliases: —.
- **Doménikos Theotokópoulos** — `PERSON` / `ARTIST`; slug `el-greco`; fechas 1541–1614; relaciones 5; aliases: El Greco.
- **Donald Judd** — `PERSON` / `ARTIST`; slug `donald-judd`; fechas 1928–1994; relaciones 4; aliases: —.
- **Donatello** — `PERSON` / `ARTIST`; slug `donatello`; fechas 1386–1466; relaciones 4; aliases: —.
- **Dorothea Lange** — `PERSON` / `ARTIST`; slug `dorothea-lange`; fechas 1895–1965; relaciones 3; aliases: —.
- **Edgar Degas** — `PERSON` / `ARTIST`; slug `edgar-degas`; fechas 1834–1917; relaciones 4; aliases: —.
- **Egon Schiele** — `PERSON` / `ARTIST`; slug `egon-schiele`; fechas 1890–1918; relaciones 4; aliases: —.
- **El Anatsui** — `PERSON` / `ARTIST`; slug `el-anatsui`; fechas 1944–…; relaciones 4; aliases: —.
- **El Lissitzky** — `PERSON` / `ARTIST`; slug `el-lissitzky`; fechas 1890–1941; relaciones 4; aliases: —.
- **Elena Guro** — `PERSON` / `ARTIST`; slug `elena-guro`; fechas 1877–1913; relaciones 4; aliases: —.
- **Ernst Ludwig Kirchner** — `PERSON` / `ARTIST`; slug `ernst-ludwig-kirchner`; fechas 1880–1938; relaciones 4; aliases: —.
- **Eugène Delacroix** — `PERSON` / `ARTIST`; slug `eugene-delacroix`; fechas 1798–1863; relaciones 4; aliases: —.
- **Eva Hesse** — `PERSON` / `ARTIST`; slug `eva-hesse`; fechas 1936–1970; relaciones 4; aliases: —.
- **Fra Angelico** — `PERSON` / `ARTIST`; slug `fra-angelico`; fechas 1395–1455; relaciones 4; aliases: —.
- **Francis Picabia** — `PERSON` / `ARTIST`; slug `francis-picabia`; fechas 1879–1953; relaciones 4; aliases: —.
- **Francisco de Goya** — `PERSON` / `ARTIST`; slug `francisco-de-goya`; fechas 1746–1828; relaciones 5; aliases: —.
- **Frank Lloyd Wright** — `PERSON` / `ARTIST`; slug `frank-lloyd-wright`; fechas 1867–1959; relaciones 4; aliases: —.
- **Frans Hals** — `PERSON` / `ARTIST`; slug `frans-hals`; fechas 1582–1666; relaciones 4; aliases: —.
- **François Boucher** — `PERSON` / `ARTIST`; slug `francois-boucher`; fechas 1703–1770; relaciones 4; aliases: —.
- **Frida Kahlo** — `PERSON` / `ARTIST`; slug `frida-kahlo`; fechas 1907–1954; relaciones 5; aliases: —.
- **Georges Braque** — `PERSON` / `ARTIST`; slug `georges-braque`; fechas 1882–1963; relaciones 5; aliases: —.
- **Georges Seurat** — `PERSON` / `ARTIST`; slug `georges-seurat`; fechas 1859–1891; relaciones 4; aliases: —.
- **Georges de La Tour** — `PERSON` / `ARTIST`; slug `georges-de-la-tour`; fechas 1593–1652; relaciones 4; aliases: —.
- **Georgia O'Keeffe** — `PERSON` / `ARTIST`; slug `georgia-okeeffe`; fechas 1887–1986; relaciones 3; aliases: —.
- **Geta Brătescu** — `PERSON` / `ARTIST`; slug `geta-bratescu`; fechas 1926–2018; relaciones 4; aliases: —.
- **Giambologna** — `PERSON` / `ARTIST`; slug `giambologna`; fechas 1529–1608; relaciones 5; aliases: —.
- **Giorgione** — `PERSON` / `ARTIST`; slug `giorgione`; fechas 1477–1510; relaciones 4; aliases: —.
- **Giotto di Bondone** — `PERSON` / `ARTIST`; slug `giotto`; fechas 1267–1337; relaciones 4; aliases: —.
- **Guido Reni** — `PERSON` / `ARTIST`; slug `guido-reni`; fechas 1575–1642; relaciones 4; aliases: —.
- **Guillermo Kuitca** — `PERSON` / `ARTIST`; slug `guillermo-kuitca`; fechas 1961–…; relaciones 4; aliases: —.
- **Gustav Klimt** — `PERSON` / `ARTIST`; slug `gustav-klimt`; fechas 1862–1918; relaciones 5; aliases: —.
- **Gustave Courbet** — `PERSON` / `ARTIST`; slug `gustave-courbet`; fechas 1819–1877; relaciones 4; aliases: —.
- **Gustave Moreau** — `PERSON` / `ARTIST`; slug `gustave-moreau`; fechas 1826–1898; relaciones 4; aliases: —.
- **Hannah Höch** — `PERSON` / `ARTIST`; slug `hannah-hoch`; fechas 1889–1978; relaciones 4; aliases: —.
- **Hans Haacke** — `PERSON` / `ARTIST`; slug `hans-haacke`; fechas 1936–…; relaciones 4; aliases: —.
- **Helen Frankenthaler** — `PERSON` / `ARTIST`; slug `helen-frankenthaler`; fechas 1928–2011; relaciones 4; aliases: —.
- **Henri Cartier-Bresson** — `PERSON` / `ARTIST`; slug `henri-cartier-bresson`; fechas 1908–2004; relaciones 3; aliases: —.
- **Henri Matisse** — `PERSON` / `ARTIST`; slug `henri-matisse`; fechas 1869–1954; relaciones 4; aliases: —.
- **Henri de Toulouse-Lautrec** — `PERSON` / `ARTIST`; slug `toulouse-lautrec`; fechas 1864–1901; relaciones 4; aliases: —.
- **Henrike Naumann** — `PERSON` / `ARTIST`; slug `henrike-naumann`; fechas 1984–…; relaciones 4; aliases: —.
- **Hilma af Klint** — `PERSON` / `ARTIST`; slug `hilma-af-klint`; fechas 1862–1944; relaciones 3; aliases: —.
- **Hiroshi Sugimoto** — `PERSON` / `ARTIST`; slug `hiroshi-sugimoto`; fechas 1948–…; relaciones 4; aliases: —.
- **Homero** — `PERSON` / `ARTIST`; slug `homer`; fechas -800–-700; relaciones 4; aliases: —.
- **Honoré Daumier** — `PERSON` / `ARTIST`; slug `honore-daumier`; fechas 1808–1879; relaciones 4; aliases: —.
- **Hélio Oiticica** — `PERSON` / `ARTIST`; slug `heli-oiticica`; fechas 1937–1980; relaciones 1; aliases: —.
- **Ibrahim el-Salahi** — `PERSON` / `ARTIST`; slug `ibrahim-el-salahi`; fechas 1930–…; relaciones 4; aliases: —.
- **Ictino** — `PERSON` / `ARTIST`; slug `ictino`; fechas -500–-430; relaciones 1; aliases: —.
- **Isidoro de Mileto** — `PERSON` / `ARTIST`; slug `isidoro-de-mileto`; fechas 442–537; relaciones 1; aliases: —.
- **J. M. W. Turner** — `PERSON` / `ARTIST`; slug `jmw-turner`; fechas 1775–1851; relaciones 5; aliases: —.
- **Jackson Pollock** — `PERSON` / `ARTIST`; slug `jackson-pollock`; fechas 1912–1956; relaciones 4; aliases: —.
- **Jacques-Louis David** — `PERSON` / `ARTIST`; slug `jacques-louis-david`; fechas 1748–1825; relaciones 5; aliases: —.
- **Jan van Eyck** — `PERSON` / `ARTIST`; slug `jan-van-eyck`; fechas 1390–1441; relaciones 4; aliases: —.
- **Jasper Johns** — `PERSON` / `ARTIST`; slug `jasper-johns`; fechas 1930–…; relaciones 4; aliases: —.
- **Jean Fautrier** — `PERSON` / `ARTIST`; slug `jean-fautrier`; fechas 1898–1964; relaciones 4; aliases: —.
- **Jean-François Millet** — `PERSON` / `ARTIST`; slug `jean-francois-millet`; fechas 1814–1875; relaciones 4; aliases: —.
- **Jean-Honoré Fragonard** — `PERSON` / `ARTIST`; slug `jean-honore-fragonard`; fechas 1732–1806; relaciones 4; aliases: —.
- **Joan Miró** — `PERSON` / `ARTIST`; slug `joan-miro`; fechas 1893–1983; relaciones 4; aliases: —.
- **Johannes Vermeer** — `PERSON` / `ARTIST`; slug `johannes-vermeer`; fechas 1632–1675; relaciones 4; aliases: —.
- **John Constable** — `PERSON` / `ARTIST`; slug `john-constable`; fechas 1776–1837; relaciones 4; aliases: —.
- **Josef Albers** — `PERSON` / `ARTIST`; slug `josef-albers`; fechas 1888–1976; relaciones 4; aliases: —.
- **Joseph Kosuth** — `PERSON` / `ARTIST`; slug `joseph-kosuth`; fechas 1945–…; relaciones 1; aliases: —.
- **José de Ribera** — `PERSON` / `ARTIST`; slug `jose-de-ribera`; fechas 1591–1652; relaciones 4; aliases: —.
- **Judy Chicago** — `PERSON` / `ARTIST`; slug `judy-chicago`; fechas 1939–…; relaciones 4; aliases: —.
- **Katsushika Hokusai** — `PERSON` / `ARTIST`; slug `katsushika-hokusai`; fechas 1760–1849; relaciones 4; aliases: —.
- **Kazimir Malévich** — `PERSON` / `ARTIST`; slug `kazimir-malevich`; fechas 1879–1935; relaciones 4; aliases: —.
- **Le Corbusier** — `PERSON` / `ARTIST`; slug `le-corbusier`; fechas 1887–1965; relaciones 4; aliases: —.
- **Lee Krasner** — `PERSON` / `ARTIST`; slug `lee-krasner`; fechas 1908–1984; relaciones 4; aliases: —.
- **Leonardo da Vinci** — `PERSON` / `ARTIST`; slug `leonardo-da-vinci`; fechas 1452–1519; relaciones 5; aliases: —.
- **Liubov Popova** — `PERSON` / `ARTIST`; slug `liubov-popova`; fechas 1889–1924; relaciones 4; aliases: —.
- **Louise Bourgeois** — `PERSON` / `ARTIST`; slug `louise-bourgeois`; fechas 1911–2010; relaciones 4; aliases: —.
- **Lygia Clark** — `PERSON` / `ARTIST`; slug `lygia-clark`; fechas 1920–1988; relaciones 4; aliases: —.
- **Lygia Pape** — `PERSON` / `ARTIST`; slug `lygia-pape`; fechas 1927–2004; relaciones 4; aliases: —.
- **Lyonel Feininger** — `PERSON` / `ARTIST`; slug `lyonel-feininger`; fechas 1871–1956; relaciones 4; aliases: —.
- **László Moholy-Nagy** — `PERSON` / `ARTIST`; slug `laszlo-moholy-nagy`; fechas 1895–1946; relaciones 4; aliases: —.
- **Man Ray** — `PERSON` / `ARTIST`; slug `man-ray`; fechas 1890–1976; relaciones 4; aliases: —.
- **Manuela Ballester** — `PERSON` / `ARTIST`; slug `manuela-ballester`; fechas 1908–1994; relaciones 4; aliases: —.
- **Marcel Duchamp** — `PERSON` / `ARTIST`; slug `marcel-duchamp`; fechas 1887–1968; relaciones 4; aliases: —.
- **Marina Abramović** — `PERSON` / `ARTIST`; slug `marina-abramovic`; fechas 1946–…; relaciones 5; aliases: —.
- **Mark Rothko** — `PERSON` / `ARTIST`; slug `mark-rothko`; fechas 1903–1970; relaciones 4; aliases: —.
- **Marlene Dumas** — `PERSON` / `ARTIST`; slug `marlene-dumas`; fechas 1953–…; relaciones 4; aliases: —.
- **Martha Rosler** — `PERSON` / `ARTIST`; slug `martha-rosler`; fechas 1943–…; relaciones 4; aliases: —.
- **Mary Cassatt** — `PERSON` / `ARTIST`; slug `mary-cassatt`; fechas 1844–1926; relaciones 4; aliases: —.
- **Masaccio** — `PERSON` / `ARTIST`; slug `masaccio`; fechas 1401–1428; relaciones 4; aliases: —.
- **Max Ernst** — `PERSON` / `ARTIST`; slug `max-ernst`; fechas 1891–1976; relaciones 4; aliases: —.
- **Meret Oppenheim** — `PERSON` / `ARTIST`; slug `meret-oppenheim`; fechas 1913–1985; relaciones 4; aliases: —.
- **Michelangelo Merisi da Caravaggio** — `PERSON` / `ARTIST`; slug `caravaggio`; fechas 1571–1610; relaciones 4; aliases: Caravaggio.
- **Miguel Ángel** — `PERSON` / `ARTIST`; slug `miguel-angel`; fechas 1475–1564; relaciones 4; aliases: Michelangelo Buonarroti.
- **Mona Hatoum** — `PERSON` / `ARTIST`; slug `mona-hatoum`; fechas 1952–…; relaciones 4; aliases: —.
- **Monir Shahroudy Farmanfarmaian** — `PERSON` / `ARTIST`; slug `monir-shahroudy-farmanfarmaian`; fechas 1924–2019; relaciones 4; aliases: —.
- **Natalia Goncharova** — `PERSON` / `ARTIST`; slug `natalia-goncharova`; fechas 1881–1962; relaciones 4; aliases: —.
- **Odilon Redon** — `PERSON` / `ARTIST`; slug `odilon-redon`; fechas 1840–1916; relaciones 4; aliases: —.
- **Oskar Schlemmer** — `PERSON` / `ARTIST`; slug `oskar-schlemmer`; fechas 1888–1943; relaciones 4; aliases: —.
- **Oswald de Andrade** — `PERSON` / `ARTIST`; slug `oswald-de-andrade`; fechas 1890–1954; relaciones 3; aliases: —.
- **Pablo Picasso** — `PERSON` / `ARTIST`; slug `pablo-picasso`; fechas 1881–1973; relaciones 7; aliases: —.
- **Paul Cézanne** — `PERSON` / `ARTIST`; slug `paul-cezanne`; fechas 1839–1906; relaciones 5; aliases: —.
- **Paul Gauguin** — `PERSON` / `ARTIST`; slug `paul-gauguin`; fechas 1848–1903; relaciones 4; aliases: —.
- **Paul Klee** — `PERSON` / `ARTIST`; slug `paul-klee`; fechas 1879–1940; relaciones 4; aliases: —.
- **Peter Paul Rubens** — `PERSON` / `ARTIST`; slug `peter-paul-rubens`; fechas 1577–1640; relaciones 4; aliases: —.
- **Philip Guston** — `PERSON` / `ARTIST`; slug `philip-guston`; fechas 1913–1980; relaciones 4; aliases: —.
- **Piero della Francesca** — `PERSON` / `ARTIST`; slug `piero-della-francesca`; fechas 1415–1492; relaciones 4; aliases: —.
- **Pierre-Auguste Renoir** — `PERSON` / `ARTIST`; slug `pierre-auguste-renoir`; fechas 1841–1919; relaciones 4; aliases: —.
- **Piet Mondrian** — `PERSON` / `ARTIST`; slug `piet-mondrian`; fechas 1872–1944; relaciones 4; aliases: —.
- **Pieter Bruegel el Viejo** — `PERSON` / `ARTIST`; slug `pieter-bruegel`; fechas 1525–1569; relaciones 4; aliases: —.
- **Plinio el Viejo** — `PERSON` / `ARTIST`; slug `plinio-el-viejo`; fechas 23–79; relaciones 3; aliases: —.
- **Policleto** — `PERSON` / `ARTIST`; slug `policleto`; fechas -480–-420; relaciones 1; aliases: —.
- **Pontormo** — `PERSON` / `ARTIST`; slug `pontormo`; fechas 1494–1557; relaciones 4; aliases: —.
- **Rafael** — `PERSON` / `ARTIST`; slug `rafael`; fechas 1483–1520; relaciones 4; aliases: Raffaello Sanzio.
- **Raja Ravi Varma** — `PERSON` / `ARTIST`; slug `raja-ravi-varma`; fechas 1848–1906; relaciones 4; aliases: —.
- **Rembrandt van Rijn** — `PERSON` / `ARTIST`; slug `rembrandt`; fechas 1606–1669; relaciones 4; aliases: —.
- **Remedios Varo** — `PERSON` / `ARTIST`; slug `remedios-varo`; fechas 1908–1963; relaciones 4; aliases: —.
- **René Magritte** — `PERSON` / `ARTIST`; slug `rene-magritte`; fechas 1898–1967; relaciones 4; aliases: —.
- **Richard Serra** — `PERSON` / `ARTIST`; slug `richard-serra`; fechas 1938–2024; relaciones 4; aliases: —.
- **Robert Delaunay** — `PERSON` / `ARTIST`; slug `robert-delaunay`; fechas 1885–1941; relaciones 3; aliases: —.
- **Robert Morris** — `PERSON` / `ARTIST`; slug `robert-morris`; fechas 1931–2018; relaciones 4; aliases: —.
- **Robert Rauschenberg** — `PERSON` / `ARTIST`; slug `robert-rauschenberg`; fechas 1925–2008; relaciones 4; aliases: —.
- **Robert Smithson** — `PERSON` / `ARTIST`; slug `robert-smithson`; fechas 1938–1973; relaciones 4; aliases: —.
- **Romuald Hazoumè** — `PERSON` / `ARTIST`; slug `romuald-hazoume`; fechas 1962–…; relaciones 4; aliases: —.
- **Rosa Bonheur** — `PERSON` / `ARTIST`; slug `rosa-bonheur`; fechas 1822–1899; relaciones 4; aliases: —.
- **Ryue Nishizawa** — `PERSON` / `ARTIST`; slug `ryue-nishizawa`; fechas 1966–…; relaciones 4; aliases: —.
- **Salvador Dalí** — `PERSON` / `ARTIST`; slug `salvador-dali`; fechas 1904–1989; relaciones 5; aliases: —.
- **Sandro Botticelli** — `PERSON` / `ARTIST`; slug `sandro-botticelli`; fechas 1445–1510; relaciones 4; aliases: —.
- **Shahzia Sikander** — `PERSON` / `ARTIST`; slug `shahzia-sikander`; fechas 1969–…; relaciones 4; aliases: —.
- **Shigeru Ban** — `PERSON` / `ARTIST`; slug `shigeru-ban`; fechas 1957–…; relaciones 4; aliases: —.
- **Shirin Neshat** — `PERSON` / `ARTIST`; slug `shirin-neshat`; fechas 1957–…; relaciones 4; aliases: —.
- **Sokari Douglas Camp** — `PERSON` / `ARTIST`; slug `sokari-douglas-camp`; fechas 1958–…; relaciones 4; aliases: —.
- **Sol LeWitt** — `PERSON` / `ARTIST`; slug `sol-lewitt`; fechas 1928–2007; relaciones 4; aliases: —.
- **Sonia Delaunay** — `PERSON` / `ARTIST`; slug `sonia-delaunay`; fechas 1885–1979; relaciones 3; aliases: —.
- **Sophie Calle** — `PERSON` / `ARTIST`; slug `sophie-calle`; fechas 1953–…; relaciones 4; aliases: —.
- **Sophie Taeuber-Arp** — `PERSON` / `ARTIST`; slug `sophie-taeuber-arp`; fechas 1889–1943; relaciones 4; aliases: —.
- **Subodh Gupta** — `PERSON` / `ARTIST`; slug `subodh-gupta`; fechas 1964–…; relaciones 4; aliases: —.
- **Sófocles** — `PERSON` / `ARTIST`; slug `sophocles`; fechas -496–-406; relaciones 4; aliases: —.
- **Takashi Murakami** — `PERSON` / `ARTIST`; slug `takashi-murakami`; fechas 1962–…; relaciones 4; aliases: —.
- **Tarsila do Amaral** — `PERSON` / `ARTIST`; slug `tarsila-do-amaral`; fechas 1886–1973; relaciones 5; aliases: —.
- **Theaster Gates** — `PERSON` / `ARTIST`; slug `theaster-gates`; fechas 1973–…; relaciones 4; aliases: —.
- **Théodore Géricault** — `PERSON` / `ARTIST`; slug `theodore-gericault`; fechas 1791–1824; relaciones 4; aliases: —.
- **Tiziano Vecellio** — `PERSON` / `ARTIST`; slug `tiziano`; fechas 1488–1576; relaciones 4; aliases: Titian.
- **Tristan Tzara** — `PERSON` / `ARTIST`; slug `tristan-tzara`; fechas 1896–1963; relaciones 4; aliases: —.
- **Utagawa Hiroshige** — `PERSON` / `ARTIST`; slug `utagawa-hiroshige`; fechas 1797–1858; relaciones 4; aliases: —.
- **Vasily Vereshchagin** — `PERSON` / `ARTIST`; slug `vassily-vereshchagin`; fechas 1842–1904; relaciones 4; aliases: —.
- **Vincent van Gogh** — `PERSON` / `ARTIST`; slug `vincent-van-gogh`; fechas 1853–1890; relaciones 5; aliases: —.
- **Vitruvio** — `PERSON` / `ARTIST`; slug `vitruvio`; fechas -80–-15; relaciones 5; aliases: —.
- **Walid Beshty** — `PERSON` / `ARTIST`; slug `walid-beshty`; fechas 1976–…; relaciones 4; aliases: —.
- **Walter Gropius** — `PERSON` / `ARTIST`; slug `walter-gropius`; fechas 1883–1969; relaciones 4; aliases: —.
- **Wang Shu** — `PERSON` / `ARTIST`; slug `wang-shu`; fechas 1963–…; relaciones 4; aliases: —.
- **Wassily Kandinsky** — `PERSON` / `ARTIST`; slug `wassily-kandinsky`; fechas 1866–1944; relaciones 4; aliases: —.
- **Wifredo Lam** — `PERSON` / `ARTIST`; slug `wifredo-lam`; fechas 1902–1982; relaciones 4; aliases: —.
- **William Blake** — `PERSON` / `ARTIST`; slug `william-blake`; fechas 1757–1827; relaciones 4; aliases: —.
- **William Kentridge** — `PERSON` / `ARTIST`; slug `william-kentridge`; fechas 1955–…; relaciones 4; aliases: —.
- **William Morris** — `PERSON` / `ARTIST`; slug `william-morris`; fechas 1834–1896; relaciones 4; aliases: —.
- **Wolfgang Tillmans** — `PERSON` / `ARTIST`; slug `wolfgang-tillmans`; fechas 1968–…; relaciones 4; aliases: —.
- **Yayoi Kusama** — `PERSON` / `ARTIST`; slug `yayoi-kusama`; fechas 1929–…; relaciones 4; aliases: —.
- **Yoko Ono** — `PERSON` / `ARTIST`; slug `yoko-ono`; fechas 1933–…; relaciones 4; aliases: —.
- **Zanele Muholi** — `PERSON` / `ARTIST`; slug `zanele-muholi`; fechas 1972–…; relaciones 4; aliases: —.
- **Édouard Manet** — `PERSON` / `ARTIST`; slug `edouard-manet`; fechas 1832–1883; relaciones 4; aliases: —.
- **Émile Bernard** — `PERSON` / `ARTIST`; slug `emile-bernard`; fechas 1868–1941; relaciones 4; aliases: —.
- **Óscar Murillo** — `PERSON` / `ARTIST`; slug `oscar-murillo`; fechas 1986–…; relaciones 4; aliases: —.

### PLACE

#### PLACE (54)

- **Alejandría** — `PLACE` / `PLACE`; slug `alejandria`; fechas —; relaciones 2; aliases: —.
- **Amberes** — `PLACE` / `PLACE`; slug `antwerp`; fechas —; relaciones 3; aliases: —.
- **Atenas** — `PLACE` / `PLACE`; slug `atenas`; fechas —; relaciones 6; aliases: —.
- **Barcelona** — `PLACE` / `PLACE`; slug `barcelona`; fechas —; relaciones 3; aliases: —.
- **Belgrado** — `PLACE` / `PLACE`; slug `belgrado`; fechas —; relaciones 3; aliases: —.
- **Benin City** — `PLACE` / `PLACE`; slug `benin-city`; fechas —; relaciones 5; aliases: —.
- **Berlín** — `PLACE` / `PLACE`; slug `berlin`; fechas —; relaciones 14; aliases: —.
- **Bogotá** — `PLACE` / `PLACE`; slug `bogota`; fechas —; relaciones 5; aliases: —.
- **Bombay** — `PLACE` / `PLACE`; slug `mumbai`; fechas —; relaciones 2; aliases: —.
- **Bruselas** — `PLACE` / `PLACE`; slug `bruselas`; fechas —; relaciones 3; aliases: —.
- **Bucarest** — `PLACE` / `PLACE`; slug `bucarest`; fechas —; relaciones 3; aliases: —.
- **Buenos Aires** — `PLACE` / `PLACE`; slug `buenos-aires`; fechas —; relaciones 5; aliases: —.
- **Ciudad de México** — `PLACE` / `PLACE`; slug `ciudad-de-mexico`; fechas —; relaciones 13; aliases: —.
- **Constantinopla** — `PLACE` / `PLACE`; slug `constantinopla`; fechas —; relaciones 4; aliases: —.
- **Cuzco** — `PLACE` / `PLACE`; slug `cuzco`; fechas —; relaciones 2; aliases: —.
- **Córdoba** — `PLACE` / `PLACE`; slug `cordoba`; fechas —; relaciones 3; aliases: —.
- **Delhi** — `PLACE` / `PLACE`; slug `delhi`; fechas —; relaciones 8; aliases: —.
- **Dessau** — `PLACE` / `PLACE`; slug `dessau`; fechas —; relaciones 2; aliases: —.
- **Djenné** — `PLACE` / `PLACE`; slug `djenne`; fechas —; relaciones 3; aliases: —.
- **El Cairo** — `PLACE` / `PLACE`; slug `cairo`; fechas —; relaciones 5; aliases: —.
- **Florencia** — `PLACE` / `PLACE`; slug `florencia`; fechas —; relaciones 23; aliases: —.
- **Hanói** — `PLACE` / `PLACE`; slug `hanoi`; fechas —; relaciones 2; aliases: —.
- **Jartum** — `PLACE` / `PLACE`; slug `jartum`; fechas —; relaciones 1; aliases: —.
- **Johannesburgo** — `PLACE` / `PLACE`; slug `johannesburgo`; fechas —; relaciones 5; aliases: —.
- **Kioto** — `PLACE` / `PLACE`; slug `kyoto`; fechas —; relaciones 2; aliases: —.
- **La Habana** — `PLACE` / `PLACE`; slug `la-habana`; fechas —; relaciones 3; aliases: —.
- **Lagos** — `PLACE` / `PLACE`; slug `lagos`; fechas —; relaciones 5; aliases: —.
- **Londres** — `PLACE` / `PLACE`; slug `londres`; fechas —; relaciones 17; aliases: —.
- **Los Ángeles** — `PLACE` / `PLACE`; slug `los-angeles`; fechas —; relaciones 1; aliases: —.
- **Madrid** — `PLACE` / `PLACE`; slug `madrid`; fechas —; relaciones 11; aliases: —.
- **Mantua** — `PLACE` / `PLACE`; slug `mantua`; fechas —; relaciones 3; aliases: —.
- **Milán** — `PLACE` / `PLACE`; slug `milan`; fechas —; relaciones 2; aliases: —.
- **Moscú** — `PLACE` / `PLACE`; slug `moscu`; fechas —; relaciones 10; aliases: —.
- **Múnich** — `PLACE` / `PLACE`; slug `munich`; fechas —; relaciones 3; aliases: —.
- **Nueva York** — `PLACE` / `PLACE`; slug `nueva-york`; fechas —; relaciones 71; aliases: —.
- **Nápoles** — `PLACE` / `PLACE`; slug `napoles`; fechas —; relaciones 3; aliases: —.
- **Núremberg** — `PLACE` / `PLACE`; slug `nuremberg`; fechas —; relaciones 3; aliases: —.
- **París** — `PLACE` / `PLACE`; slug `paris`; fechas —; relaciones 98; aliases: —.
- **Pekín** — `PLACE` / `PLACE`; slug `pekin`; fechas —; relaciones 5; aliases: —.
- **Praga** — `PLACE` / `PLACE`; slug `praga`; fechas —; relaciones 2; aliases: —.
- **Roma** — `PLACE` / `PLACE`; slug `roma`; fechas —; relaciones 21; aliases: —.
- **Seúl** — `PLACE` / `PLACE`; slug `seul`; fechas —; relaciones 1; aliases: —.
- **São Paulo** — `PLACE` / `PLACE`; slug `sao-paulo`; fechas —; relaciones 9; aliases: —.
- **Teherán** — `PLACE` / `PLACE`; slug `teheran`; fechas —; relaciones 3; aliases: —.
- **Tenochtitlan** — `PLACE` / `PLACE`; slug `tenochtitlan`; fechas —; relaciones 2; aliases: —.
- **Teotihuacan** — `PLACE` / `PLACE`; slug `teotihuacan`; fechas —; relaciones 2; aliases: —.
- **Tokio** — `PLACE` / `PLACE`; slug `tokio`; fechas —; relaciones 18; aliases: —.
- **Toledo** — `PLACE` / `PLACE`; slug `toledo`; fechas —; relaciones 3; aliases: —.
- **Toledo** — `PLACE` / `PLACE`; slug `toledo-espanol`; fechas —; relaciones 2; aliases: —.
- **Venecia** — `PLACE` / `PLACE`; slug `venecia`; fechas —; relaciones 6; aliases: —.
- **Viena** — `PLACE` / `PLACE`; slug `viena`; fechas —; relaciones 7; aliases: —.
- **Weimar** — `PLACE` / `PLACE`; slug `weimar`; fechas —; relaciones 8; aliases: —.
- **Zúrich** — `PLACE` / `PLACE`; slug `zurich`; fechas —; relaciones 5; aliases: —.
- **Ámsterdam** — `PLACE` / `PLACE`; slug `amsterdam`; fechas —; relaciones 12; aliases: —.

### WORK

#### ARTWORK (224)

- **Abaporu** — `WORK` / `ARTWORK`; slug `abaporu`; fechas 1928–…; relaciones 5; aliases: —.
- **Amistad** — `WORK` / `ARTWORK`; slug `amistad`; fechas 1963–1963; relaciones 5; aliases: —.
- **Antropofagia** — `WORK` / `ARTWORK`; slug `antropofagia`; fechas 1928–1928; relaciones 4; aliases: —.
- **Apuntes para la historia del arte** — `WORK` / `ARTWORK`; slug `apuntes-para-la-historia-del-arte`; fechas 1980–1980; relaciones 4; aliases: —.
- **Arco inclinado** — `WORK` / `ARTWORK`; slug `arco-inclinado`; fechas 1981–1981; relaciones 4; aliases: —.
- **Asunción de la Virgen** — `WORK` / `ARTWORK`; slug `asuncion-de-la-virgen-carracci`; fechas 1600–1600; relaciones 6; aliases: —.
- **Augusto de Prima Porta** — `WORK` / `ARTWORK`; slug `augusto-de-prima-porta`; fechas 20–20; relaciones 4; aliases: —.
- **Autorretrato** — `WORK` / `ARTWORK`; slug `self-portrait-angelica-kauffmann`; fechas 1770–1770; relaciones 5; aliases: —.
- **Autorretrato** — `WORK` / `ARTWORK`; slug `autorretrato-manuela-ballester`; fechas 1940–1940; relaciones 5; aliases: —.
- **Autorretrato con collar de espinas** — `WORK` / `ARTWORK`; slug `autorretrato-con-collar-de-espinas`; fechas 1940–…; relaciones 6; aliases: —.
- **Autorretrato con farol chino** — `WORK` / `ARTWORK`; slug `autorretrato-con-linterna`; fechas 1912–1912; relaciones 5; aliases: —.
- **Ballet triádico** — `WORK` / `ARTWORK`; slug `ballet-triadico`; fechas 1922–1922; relaciones 4; aliases: —.
- **Bandera** — `WORK` / `ARTWORK`; slug `bandera`; fechas 1955–1955; relaciones 6; aliases: —.
- **Blue Print** — `WORK` / `ARTWORK`; slug `blue-print`; fechas 2005–2005; relaciones 4; aliases: —.
- **Boulevard Montmartre** — `WORK` / `ARTWORK`; slug `boulevard-montmartre`; fechas 1897–1897; relaciones 6; aliases: —.
- **Bretonas en el prado** — `WORK` / `ARTWORK`; slug `bretonas-en-el-prado`; fechas 1888–1888; relaciones 4; aliases: —.
- **Bronces de Benín** — `WORK` / `ARTWORK`; slug `bronces-de-benin`; fechas 1500–1800; relaciones 7; aliases: —.
- **Busto de Nefertiti** — `WORK` / `ARTWORK`; slug `busto-de-nefertiti`; fechas -1345–…; relaciones 12; aliases: —.
- **Cage** — `WORK` / `ARTWORK`; slug `cage`; fechas 1990–1990; relaciones 4; aliases: —.
- **Calle de Berlín** — `WORK` / `ARTWORK`; slug `calle-de-berlin`; fechas 1913–1913; relaciones 5; aliases: —.
- **Campanile de Giotto** — `WORK` / `ARTWORK`; slug `campanile-de-giotto`; fechas 1334–1334; relaciones 6; aliases: —.
- **Cartel de la guerra** — `WORK` / `ARTWORK`; slug `cartel-de-la-guerra`; fechas 1943–1943; relaciones 6; aliases: —.
- **Casa de la Cascada** — `WORK` / `ARTWORK`; slug `casa-sobre-la-cascada`; fechas 1935–1939; relaciones 13; aliases: —.
- **Catarata** — `WORK` / `ARTWORK`; slug `catarata`; fechas 1967–1967; relaciones 4; aliases: —.
- **Catedral de Chartres** — `WORK` / `ARTWORK`; slug `catedral-de-chartres`; fechas 1194–1220; relaciones 7; aliases: —.
- **Cazadores en la nieve** — `WORK` / `ARTWORK`; slug `cazadores-en-la-nieve`; fechas 1565–1565; relaciones 5; aliases: —.
- **Columna de Trajano** — `WORK` / `ARTWORK`; slug `columna-de-trajano`; fechas 113–113; relaciones 6; aliases: —.
- **Composición** — `WORK` / `ARTWORK`; slug `composicion`; fechas 1955–1955; relaciones 4; aliases: —.
- **Composición VIII** — `WORK` / `ARTWORK`; slug `composicion-viii`; fechas 1923–…; relaciones 4; aliases: —.
- **Composición con rojo, azul y amarillo** — `WORK` / `ARTWORK`; slug `composicion-rojo-azul-amarillo`; fechas 1930–1930; relaciones 5; aliases: —.
- **Contingente** — `WORK` / `ARTWORK`; slug `contingente`; fechas 1969–1969; relaciones 5; aliases: —.
- **Corte con el cuchillo de cocina** — `WORK` / `ARTWORK`; slug `corte-con-el-cuchillo-de-cocina`; fechas 1919–1919; relaciones 5; aliases: —.
- **Creación de las aves** — `WORK` / `ARTWORK`; slug `creacion-de-las-aves`; fechas 1957–1957; relaciones 5; aliases: —.
- **Cristo Pantocrátor** — `WORK` / `ARTWORK`; slug `icono-de-cristo-pantocrator`; fechas 1100–1100; relaciones 4; aliases: —.
- **Cuadrado negro** — `WORK` / `ARTWORK`; slug `cuadrado-negro`; fechas 1915–…; relaciones 4; aliases: —.
- **Cuadro negro** — `WORK` / `ARTWORK`; slug `cuadro-negro-popova`; fechas 1918–1918; relaciones 4; aliases: —.
- **Cut Piece** — `WORK` / `ARTWORK`; slug `cut-piece`; fechas 1964–…; relaciones 4; aliases: —.
- **Cámara de los esposos** — `WORK` / `ARTWORK`; slug `camera-degli-sposi`; fechas 1474–1474; relaciones 4; aliases: —.
- **Código de Hammurabi** — `WORK` / `ARTWORK`; slug `codigo-de-hammurabi`; fechas -1750–-1750; relaciones 3; aliases: —.
- **Dama con lámpara** — `WORK` / `ARTWORK`; slug `dama-con-lampara`; fechas 1900–…; relaciones 8; aliases: —.
- **Dama en la calle** — `WORK` / `ARTWORK`; slug `dama-en-la-calle`; fechas 1920–1920; relaciones 8; aliases: —.
- **Danza vertical** — `WORK` / `ARTWORK`; slug `danza-vertical`; fechas 1926–1926; relaciones 4; aliases: —.
- **David** — `WORK` / `ARTWORK`; slug `david-de-miguel-angel`; fechas 1501–1504; relaciones 12; aliases: —.
- **Detrás de la estación Saint-Lazare** — `WORK` / `ARTWORK`; slug `detrás-de-la-estacion-saint-lazare`; fechas 1932–…; relaciones 7; aliases: —.
- **Dibujo mural 118** — `WORK` / `ARTWORK`; slug `dibujo-mural-118`; fechas 1971–1971; relaciones 5; aliases: —.
- **Discóbolo** — `WORK` / `ARTWORK`; slug `discobolo`; fechas -450–-450; relaciones 3; aliases: —.
- **Divisor** — `WORK` / `ARTWORK`; slug `divisor`; fechas 1968–1968; relaciones 6; aliases: —.
- **Dorchester Projects** — `WORK` / `ARTWORK`; slug `dorchester-projects`; fechas 2009–2009; relaciones 5; aliases: —.
- **Doríforo** — `WORK` / `ARTWORK`; slug `doryphoros`; fechas -450–-440; relaciones 9; aliases: —.
- **Dos niños amenazados por un ruiseñor** — `WORK` / `ARTWORK`; slug `dos-ninos-amenazados-por-un-ruisenor`; fechas 1924–1924; relaciones 5; aliases: —.
- **Double Plot** — `WORK` / `ARTWORK`; slug `otobong-nkanga`; fechas 1978–1978; relaciones 4; aliases: —.
- **Díptico de Marilyn** — `WORK` / `ARTWORK`; slug `diptico-marilyn`; fechas 1962–…; relaciones 11; aliases: —.
- **Eco de un grito** — `WORK` / `ARTWORK`; slug `eco-de-un-grito`; fechas 1937–1937; relaciones 5; aliases: —.
- **Edificio Bauhaus de Dessau** — `WORK` / `ARTWORK`; slug `edificio-bauhaus-dessau`; fechas 1925–1926; relaciones 12; aliases: —.
- **El 3 de mayo de 1808** — `WORK` / `ARTWORK`; slug `tres-de-mayo-1808`; fechas 1814–…; relaciones 12; aliases: —.
- **El Gran Canal** — `WORK` / `ARTWORK`; slug `canaletto-gran-canal`; fechas 1730–…; relaciones 4; aliases: —.
- **El almuerzo de los remeros** — `WORK` / `ARTWORK`; slug `almuerzo-de-los-remeros`; fechas 1881–…; relaciones 8; aliases: —.
- **El anciano de los días** — `WORK` / `ARTWORK`; slug `el-anciano-de-los-dias`; fechas 1794–1794; relaciones 5; aliases: —.
- **El banquete de Cleopatra** — `WORK` / `ARTWORK`; slug `el-banquete-de-cleopatra`; fechas 1747–1747; relaciones 6; aliases: —.
- **El barco de esclavos** — `WORK` / `ARTWORK`; slug `el-barco-de-esclavos`; fechas 1840–…; relaciones 5; aliases: —.
- **El baño del niño** — `WORK` / `ARTWORK`; slug `el-bano-del-nino`; fechas 1893–1893; relaciones 5; aliases: —.
- **El beso** — `WORK` / `ARTWORK`; slug `el-beso-klimt`; fechas 1907–1908; relaciones 4; aliases: —.
- **El caballero sonriente** — `WORK` / `ARTWORK`; slug `caballero-sonriente`; fechas 1624–1624; relaciones 4; aliases: —.
- **El caminante sobre el mar de nubes** — `WORK` / `ARTWORK`; slug `el-caminante-sobre-el-mar-de-nubes`; fechas 1818–1818; relaciones 6; aliases: —.
- **El carnaval del arlequín** — `WORK` / `ARTWORK`; slug `carnaval-del-arlequin`; fechas 1924–1924; relaciones 5; aliases: —.
- **El ciclista** — `WORK` / `ARTWORK`; slug `el-ciclista`; fechas 1913–1913; relaciones 4; aliases: —.
- **El columpio** — `WORK` / `ARTWORK`; slug `el-columpio`; fechas 1768–1768; relaciones 4; aliases: —.
- **El entierro del conde de Orgaz** — `WORK` / `ARTWORK`; slug `entierro-del-conde-de-orgaz`; fechas 1586–1588; relaciones 8; aliases: —.
- **El hijo del hombre** — `WORK` / `ARTWORK`; slug `el-hijo-del-hombre`; fechas 1964–…; relaciones 4; aliases: —.
- **El hombre en la encrucijada** — `WORK` / `ARTWORK`; slug `hombre-en-la-encrucijada`; fechas 1934–…; relaciones 10; aliases: —.
- **El juramento de los Horacios** — `WORK` / `ARTWORK`; slug `juramento-de-los-horacios`; fechas 1784–…; relaciones 10; aliases: —.
- **El mar** — `WORK` / `ARTWORK`; slug `el-mar`; fechas 1990–1990; relaciones 4; aliases: —.
- **El nacimiento de Venus** — `WORK` / `ARTWORK`; slug `el-nacimiento-de-venus`; fechas 1484–1486; relaciones 13; aliases: —.
- **El ojo como globo extraño** — `WORK` / `ARTWORK`; slug `el-ojo-como-globo-extrano`; fechas 1882–1882; relaciones 4; aliases: —.
- **El patizambo** — `WORK` / `ARTWORK`; slug `el-pie-zambo`; fechas 1642–1642; relaciones 5; aliases: —.
- **El pensador** — `WORK` / `ARTWORK`; slug `el-pensador`; fechas 1904–…; relaciones 7; aliases: —.
- **El pequeño camello** — `WORK` / `ARTWORK`; slug `el-pequeno-camello`; fechas 1910–1910; relaciones 5; aliases: —.
- **El vagón de tercera clase** — `WORK` / `ARTWORK`; slug `el-tranvia-de-tercera-clase`; fechas 1864–1864; relaciones 4; aliases: —.
- **Embarcadero espiral** — `WORK` / `ARTWORK`; slug `spiral-jetty`; fechas 1970–1970; relaciones 5; aliases: —.
- **Equivalentes** — `WORK` / `ARTWORK`; slug `equivalentes`; fechas 1923–1923; relaciones 8; aliases: —.
- **Escultura blanda** — `WORK` / `ARTWORK`; slug `soft-sculpture`; fechas 1962–1962; relaciones 6; aliases: —.
- **Estela de Naram-Sin** — `WORK` / `ARTWORK`; slug `estela-de-naram-sin`; fechas -2254–-2218; relaciones 6; aliases: —.
- **Estudio para el juramento de los Horacios** — `WORK` / `ARTWORK`; slug `el-juramento-de-los-horacios-estudio`; fechas 1784–1784; relaciones 6; aliases: —.
- **Faces and Phases** — `WORK` / `ARTWORK`; slug `faces-and-phases`; fechas 2010–2010; relaciones 10; aliases: —.
- **Felix en el exilio** — `WORK` / `ARTWORK`; slug `felix-en-el-exilio`; fechas 1994–1994; relaciones 5; aliases: —.
- **Fiesta de amor** — `WORK` / `ARTWORK`; slug `fiesta-de-amor`; fechas 1717–1717; relaciones 4; aliases: —.
- **Fisicromía** — `WORK` / `ARTWORK`; slug `fisicromia`; fechas 1965–1965; relaciones 4; aliases: —.
- **Fleshly Sight** — `WORK` / `ARTWORK`; slug `fleshly-sight`; fechas 2004–2004; relaciones 4; aliases: —.
- **Freischwimmer** — `WORK` / `ARTWORK`; slug `freischwimmer`; fechas 2004–2004; relaciones 8; aliases: —.
- **From Here I Saw What Happened** — `WORK` / `ARTWORK`; slug `from-here-i-saw-what-happened`; fechas 1995–…; relaciones 12; aliases: —.
- **Fuente** — `WORK` / `ARTWORK`; slug `fuente`; fechas 1917–…; relaciones 10; aliases: —.
- **Fumarolas** — `WORK` / `ARTWORK`; slug `fumarolas`; fechas 1964–1964; relaciones 4; aliases: —.
- **Gran Mezquita de Djenné** — `WORK` / `ARTWORK`; slug `gran-mezquita-de-djenne`; fechas 1907–…; relaciones 10; aliases: —.
- **Gran Mezquita de Samarra** — `WORK` / `ARTWORK`; slug `mezquita-de-samarra`; fechas 851–851; relaciones 5; aliases: —.
- **Guernica** — `WORK` / `ARTWORK`; slug `guernica`; fechas 1937–…; relaciones 18; aliases: —.
- **Hipómenes y Atalanta** — `WORK` / `ARTWORK`; slug `hipomenes-y-atlanta`; fechas 1618–1618; relaciones 6; aliases: —.
- **Homenaje al cuadrado** — `WORK` / `ARTWORK`; slug `homenaje-al-cuadrado`; fechas 1950–1950; relaciones 4; aliases: —.
- **Hot Spot** — `WORK` / `ARTWORK`; slug `hot-spot`; fechas 2006–2006; relaciones 6; aliases: —.
- **Impresión, sol naciente** — `WORK` / `ARTWORK`; slug `impresion-sol-naciente`; fechas 1872–…; relaciones 8; aliases: —.
- **Infinity Mirrored Room** — `WORK` / `ARTWORK`; slug `infinity-mirrored-room`; fechas 1965–…; relaciones 7; aliases: —.
- **Inmaculada de Soult** — `WORK` / `ARTWORK`; slug `inmaculada-de-soult`; fechas 1678–1678; relaciones 5; aliases: —.
- **Inserción en circuitos ideológicos** — `WORK` / `ARTWORK`; slug `insertion-into-circuit`; fechas 1970–1970; relaciones 6; aliases: —.
- **Jimson Weed** — `WORK` / `ARTWORK`; slug `jimson-weed`; fechas 1936–1936; relaciones 4; aliases: —.
- **Judith y su doncella** — `WORK` / `ARTWORK`; slug `judith-y-su-doncella`; fechas 1614–1614; relaciones 5; aliases: —.
- **Júpiter y Sémele** — `WORK` / `ARTWORK`; slug `jupiter-y-semele`; fechas 1894–1894; relaciones 5; aliases: —.
- **La Anunciación** — `WORK` / `ARTWORK`; slug `la-anunciacion-fra-angelico`; fechas 1438–1438; relaciones 5; aliases: —.
- **La Gioconda** — `WORK` / `ARTWORK`; slug `mona-lisa`; fechas 1503–1519; relaciones 12; aliases: Mona Lisa.
- **La Libertad guiando al pueblo** — `WORK` / `ARTWORK`; slug `libertad-guiando-al-pueblo`; fechas 1830–…; relaciones 7; aliases: —.
- **La Magdalena penitente** — `WORK` / `ARTWORK`; slug `la-magdalena-penitente`; fechas 1640–1640; relaciones 4; aliases: —.
- **La Virgen del cuello largo** — `WORK` / `ARTWORK`; slug `la-virgen-del-cuello-largo`; fechas 1535–1535; relaciones 6; aliases: —.
- **La apoteosis de la guerra** — `WORK` / `ARTWORK`; slug `la-porcion-de-la-guerra`; fechas 1871–1871; relaciones 6; aliases: —.
- **La balsa de la Medusa** — `WORK` / `ARTWORK`; slug `la-balsa-de-la-medusa`; fechas 1819–1819; relaciones 6; aliases: —.
- **La bouche du temps** — `WORK` / `ARTWORK`; slug `la-boca-del-tiempo`; fechas 2004–2004; relaciones 4; aliases: —.
- **La carreta de heno** — `WORK` / `ARTWORK`; slug `el-carro-de-heno`; fechas 1821–1821; relaciones 5; aliases: —.
- **La ciudad al final del mundo** — `WORK` / `ARTWORK`; slug `la-ciudad-al-final-del-mundo`; fechas 1928–1928; relaciones 4; aliases: —.
- **La clase de danza** — `WORK` / `ARTWORK`; slug `la-clase-de-danza`; fechas 1874–…; relaciones 4; aliases: —.
- **La corriente del Golfo** — `WORK` / `ARTWORK`; slug `la-corriente-del-golfo`; fechas 1899–1899; relaciones 5; aliases: —.
- **La cuna** — `WORK` / `ARTWORK`; slug `la-cuna`; fechas 1872–1872; relaciones 5; aliases: —.
- **La danza** — `WORK` / `ARTWORK`; slug `la-danza-matisse`; fechas 1910–1910; relaciones 5; aliases: —.
- **La elevación de la cruz** — `WORK` / `ARTWORK`; slug `elevacion-de-la-cruz`; fechas 1610–1610; relaciones 5; aliases: —.
- **La escuela de Atenas** — `WORK` / `ARTWORK`; slug `escuela-de-atenas`; fechas 1509–1511; relaciones 12; aliases: —.
- **La expulsión del paraíso** — `WORK` / `ARTWORK`; slug `la-expulsion-del-paraiso`; fechas 1427–1427; relaciones 4; aliases: —.
- **La feria de caballos** — `WORK` / `ARTWORK`; slug `la-feria-de-caballos`; fechas 1853–1853; relaciones 5; aliases: —.
- **La flagelación de Cristo** — `WORK` / `ARTWORK`; slug `flagelacion-de-cristo`; fechas 1455–1455; relaciones 4; aliases: —.
- **La gran ola de Kanagawa** — `WORK` / `ARTWORK`; slug `gran-ola-de-kanagawa`; fechas 1831–…; relaciones 15; aliases: —.
- **La inundación en Port-Marly** — `WORK` / `ARTWORK`; slug `la-inundacion-en-port-marly`; fechas 1876–1876; relaciones 6; aliases: —.
- **La joven de la perla** — `WORK` / `ARTWORK`; slug `joven-de-la-perla`; fechas 1665–…; relaciones 10; aliases: —.
- **La jungla** — `WORK` / `ARTWORK`; slug `la-jungla-lam`; fechas 1943–…; relaciones 8; aliases: —.
- **La noche estrellada** — `WORK` / `ARTWORK`; slug `noche-estrellada`; fechas 1889–…; relaciones 11; aliases: —.
- **La persistencia de la memoria** — `WORK` / `ARTWORK`; slug `la-persistencia-de-la-memoria`; fechas 1931–…; relaciones 7; aliases: —.
- **La ronda de noche** — `WORK` / `ARTWORK`; slug `ronda-de-noche`; fechas 1642–…; relaciones 8; aliases: —.
- **La tempestad** — `WORK` / `ARTWORK`; slug `la-tempestad`; fechas 1508–1508; relaciones 4; aliases: —.
- **La vocación de san Mateo** — `WORK` / `ARTWORK`; slug `vocacion-de-san-mateo`; fechas 1599–1600; relaciones 9; aliases: —.
- **La última cena** — `WORK` / `ARTWORK`; slug `ultima-cena`; fechas 1495–1498; relaciones 11; aliases: —.
- **Laocoonte y sus hijos** — `WORK` / `ARTWORK`; slug `laocoonte`; fechas -50–…; relaciones 7; aliases: —.
- **Las Meninas** — `WORK` / `ARTWORK`; slug `las-meninas`; fechas 1656–…; relaciones 15; aliases: —.
- **Las dos Fridas** — `WORK` / `ARTWORK`; slug `las-dos-fridas`; fechas 1939–…; relaciones 13; aliases: —.
- **Las espigadoras** — `WORK` / `ARTWORK`; slug `las-espigadoras`; fechas 1857–1857; relaciones 6; aliases: —.
- **Las señoritas de Aviñón** — `WORK` / `ARTWORK`; slug `las-senoritas-de-avignon`; fechas 1907–…; relaciones 8; aliases: —.
- **Lluvia repentina sobre el puente Ohashi** — `WORK` / `ARTWORK`; slug `lluvia-repentina-sobre-el-puente-ohashi`; fechas 1857–…; relaciones 10; aliases: —.
- **Lluvia, vapor y velocidad** — `WORK` / `ARTWORK`; slug `vapor-y-nubes-de-steam-boat`; fechas 1844–…; relaciones 7; aliases: —.
- **Los diez mayores** — `WORK` / `ARTWORK`; slug `los-diez-mayores`; fechas 1907–1907; relaciones 4; aliases: —.
- **Los girasoles** — `WORK` / `ARTWORK`; slug `los-girasoles`; fechas 1888–…; relaciones 8; aliases: —.
- **Los guerreros** — `WORK` / `ARTWORK`; slug `los-guerreros`; fechas 1960–1960; relaciones 4; aliases: —.
- **Lunar Caustic** — `WORK` / `ARTWORK`; slug `lunar-caustic`; fechas 1920–1920; relaciones 4; aliases: —.
- **Líneas de Nazca** — `WORK` / `ARTWORK`; slug `lineas-de-nazca`; fechas -200–600; relaciones 5; aliases: —.
- **Madame de Pompadour** — `WORK` / `ARTWORK`; slug `madame-de-pompadour`; fechas 1756–1756; relaciones 5; aliases: —.
- **Madre migrante** — `WORK` / `ARTWORK`; slug `migrant-mother`; fechas 1936–…; relaciones 12; aliases: —.
- **Magdalena** — `WORK` / `ARTWORK`; slug `magdalena`; fechas 1995–1995; relaciones 6; aliases: —.
- **Maman** — `WORK` / `ARTWORK`; slug `maman`; fechas 1999–…; relaciones 13; aliases: —.
- **Manhattan Real Estate Holdings** — `WORK` / `ARTWORK`; slug `manhattan-real-estate-holdings`; fechas 1971–1971; relaciones 6; aliases: —.
- **Melancolía I** — `WORK` / `ARTWORK`; slug `melancolia-i`; fechas 1514–1514; relaciones 5; aliases: —.
- **Mezquita Azul** — `WORK` / `ARTWORK`; slug `mezquita-azul`; fechas 1609–1616; relaciones 3; aliases: —.
- **Mezquita de Córdoba** — `WORK` / `ARTWORK`; slug `gran-mezquita-de-cordoba`; fechas 785–…; relaciones 6; aliases: —.
- **Mirror Ball** — `WORK` / `ARTWORK`; slug `mirror-ball`; fechas 1970–1970; relaciones 6; aliases: —.
- **Modern Magic** — `WORK` / `ARTWORK`; slug `modern-magic`; fechas 2017–2017; relaciones 6; aliases: —.
- **Modulador espacio-luz** — `WORK` / `ARTWORK`; slug `modulador-espacio-luz`; fechas 1930–1930; relaciones 4; aliases: —.
- **Monograma** — `WORK` / `ARTWORK`; slug `monograma`; fechas 1955–1955; relaciones 6; aliases: —.
- **Mont Sainte-Victoire** — `WORK` / `ARTWORK`; slug `mont-sainte-victoire`; fechas 1904–1906; relaciones 9; aliases: —.
- **Montañas y mar** — `WORK` / `ARTWORK`; slug `montanas-y-mar`; fechas 1952–1952; relaciones 4; aliases: —.
- **Monumento para V. Tatlin** — `WORK` / `ARTWORK`; slug `monumento-para-v`; fechas 1964–1964; relaciones 4; aliases: —.
- **Moulin Rouge: La Goulue** — `WORK` / `ARTWORK`; slug `moulin-rouge-la-goulue`; fechas 1891–1891; relaciones 4; aliases: —.
- **Museo de Ningbo** — `WORK` / `ARTWORK`; slug `museo-de-ningbo`; fechas 2008–2008; relaciones 5; aliases: —.
- **Máquina de trinar** — `WORK` / `ARTWORK`; slug `maquina-de-trinar`; fechas 1922–1922; relaciones 5; aliases: —.
- **Móvil rojo** — `WORK` / `ARTWORK`; slug `mobile-calder-rojo`; fechas 1956–…; relaciones 4; aliases: —.
- **Narrativa no lineal** — `WORK` / `ARTWORK`; slug `no-linear-narrative`; fechas 2004–2004; relaciones 5; aliases: —.
- **Número 14** — `WORK` / `ARTWORK`; slug `numero-14`; fechas 1960–…; relaciones 4; aliases: —.
- **Número 1A, 1948** — `WORK` / `ARTWORK`; slug `numero-1a`; fechas 1948–…; relaciones 4; aliases: —.
- **Objeto para ser destruido** — `WORK` / `ARTWORK`; slug `objeto-para-ser-destruido`; fechas 1931–…; relaciones 4; aliases: —.
- **Olympia** — `WORK` / `ARTWORK`; slug `olympia`; fechas 1863–…; relaciones 13; aliases: —.
- **One and Three Chairs** — `WORK` / `ARTWORK`; slug `obra-de-arte-en-el-tiempo`; fechas 1965–…; relaciones 4; aliases: —.
- **Palacio de Versalles** — `WORK` / `ARTWORK`; slug `palacio-de-versailles`; fechas 1661–1715; relaciones 3; aliases: —.
- **Panteón de Roma** — `WORK` / `ARTWORK`; slug `panteon-de-roma`; fechas 118–128; relaciones 7; aliases: —.
- **Paper Church** — `WORK` / `ARTWORK`; slug `paper-church`; fechas 1995–1995; relaciones 4; aliases: —.
- **Partenón** — `WORK` / `ARTWORK`; slug `partenon`; fechas -447–-432; relaciones 7; aliases: —.
- **Piedra del Sol** — `WORK` / `ARTWORK`; slug `piedra-del-sol`; fechas 1479–1521; relaciones 4; aliases: —.
- **Pinturas de Lascaux** — `WORK` / `ARTWORK`; slug `cueva-de-lascaux`; fechas -17000–…; relaciones 6; aliases: —.
- **Prismas eléctricos** — `WORK` / `ARTWORK`; slug `prismas-electricos`; fechas 1914–1914; relaciones 4; aliases: —.
- **Psique reanimada por el beso** — `WORK` / `ARTWORK`; slug `psique-reanimada-por-el-beso`; fechas 1787–1787; relaciones 8; aliases: —.
- **Puerta de Ishtar** — `WORK` / `ARTWORK`; slug `puerta-de-ishtar`; fechas -575–-575; relaciones 5; aliases: —.
- **Pájaro en el espacio** — `WORK` / `ARTWORK`; slug `pajaro-en-el-espacio`; fechas 1928–1928; relaciones 4; aliases: —.
- **Rapto de las sabinas** — `WORK` / `ARTWORK`; slug `rapto-de-las-sabinas`; fechas 1583–1583; relaciones 8; aliases: —.
- **Rayografía** — `WORK` / `ARTWORK`; slug `rayografia`; fechas 1922–1922; relaciones 8; aliases: —.
- **Red House** — `WORK` / `ARTWORK`; slug `red-house-morris`; fechas 1860–1860; relaciones 5; aliases: —.
- **Rehenes** — `WORK` / `ARTWORK`; slug `otages-fautrier`; fechas 1945–1945; relaciones 5; aliases: —.
- **Retrato de Adele Bloch-Bauer I** — `WORK` / `ARTWORK`; slug `retrato-de-adele-bloch-bauer`; fechas 1907–…; relaciones 6; aliases: —.
- **Retrato de Giovanni Arnolfini** — `WORK` / `ARTWORK`; slug `retrato-de-giovanni-arnolfini`; fechas 1434–1434; relaciones 5; aliases: —.
- **Retrato de Manuela** — `WORK` / `ARTWORK`; slug `retrato-de-manuela`; fechas 1965–1965; relaciones 6; aliases: —.
- **Rhythm 0** — `WORK` / `ARTWORK`; slug `rhythm-0`; fechas 1974–…; relaciones 3; aliases: —.
- **San Jorge** — `WORK` / `ARTWORK`; slug `san-jorge-donato`; fechas 1417–1417; relaciones 6; aliases: —.
- **Santa Sofía** — `WORK` / `ARTWORK`; slug `hagia-sophia`; fechas 532–537; relaciones 8; aliases: —.
- **Saturno devorando a su hijo** — `WORK` / `ARTWORK`; slug `saturno-devorando-a-su-hijo`; fechas 1820–1823; relaciones 8; aliases: —.
- **Seascapes** — `WORK` / `ARTWORK`; slug `seascapes`; fechas 1980–1980; relaciones 10; aliases: —.
- **Semillas de girasol** — `WORK` / `ARTWORK`; slug `semillas-de-girasol`; fechas 2010–…; relaciones 9; aliases: —.
- **Semiotics of the Kitchen** — `WORK` / `ARTWORK`; slug `semiotica-de-la-cocina`; fechas 1975–1975; relaciones 6; aliases: —.
- **Seoul Home** — `WORK` / `ARTWORK`; slug `seul-hogar`; fechas 1999–1999; relaciones 4; aliases: —.
- **Shibboleth** — `WORK` / `ARTWORK`; slug `shibboleth`; fechas 2007–…; relaciones 6; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-twombly`; fechas 1968–1968; relaciones 4; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-morris`; fechas 1965–1965; relaciones 4; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-judd`; fechas 1969–1969; relaciones 5; aliases: —.
- **Suite Vénitienne** — `WORK` / `ARTWORK`; slug `suite-veneciana`; fechas 1980–1980; relaciones 4; aliases: —.
- **Tan Tan Bo** — `WORK` / `ARTWORK`; slug `tan-tan-bo`; fechas 2001–2001; relaciones 6; aliases: —.
- **Tapiz de Bayeux** — `WORK` / `ARTWORK`; slug `tapiz-de-bayeux`; fechas 1066–1077; relaciones 5; aliases: —.
- **Teatro de Epidauro** — `WORK` / `ARTWORK`; slug `teatro-de-epidauro`; fechas -340–-340; relaciones 6; aliases: —.
- **Teléfono langosta** — `WORK` / `ARTWORK`; slug `lobster-telephone`; fechas 1938–…; relaciones 4; aliases: —.
- **Templo de Kukulkán** — `WORK` / `ARTWORK`; slug `templo-de-kukulcan`; fechas 800–1000; relaciones 5; aliases: —.
- **The Body as Archive** — `WORK` / `ARTWORK`; slug `cuerpo-como-archivo`; fechas 1998–…; relaciones 3; aliases: —.
- **The Cleaner** — `WORK` / `ARTWORK`; slug `the-cleaner`; fechas 2015–2015; relaciones 6; aliases: —.
- **The Dinner Party** — `WORK` / `ARTWORK`; slug `the-dinner-party`; fechas 1979–1979; relaciones 6; aliases: —.
- **The Last Sound** — `WORK` / `ARTWORK`; slug `the-last-sound`; fechas 1964–1964; relaciones 4; aliases: —.
- **The Trees** — `WORK` / `ARTWORK`; slug `the-trees`; fechas 2009–2009; relaciones 4; aliases: —.
- **Tierra desarrollando más raíces** — `WORK` / `ARTWORK`; slug `tierra-desarrollando-mas-raices`; fechas 2018–2018; relaciones 5; aliases: —.
- **Torre Eiffel** — `WORK` / `ARTWORK`; slug `torre-eiffel-robert-delaunay`; fechas 1911–1911; relaciones 3; aliases: —.
- **Tropicália** — `WORK` / `ARTWORK`; slug `tropicalia-obra`; fechas 1967–…; relaciones 6; aliases: —.
- **Un entierro en Ornans** — `WORK` / `ARTWORK`; slug `entierro-en-ornans`; fechas 1849–1850; relaciones 6; aliases: —.
- **Una tarde de domingo** — `WORK` / `ARTWORK`; slug `una-tarde-de-domingo`; fechas 1886–1886; relaciones 6; aliases: —.
- **Untitled Film Still #21** — `WORK` / `ARTWORK`; slug `untitled-film-still-21`; fechas 1978–…; relaciones 8; aliases: —.
- **Vence a los blancos con la cuña roja** — `WORK` / `ARTWORK`; slug `vence-a-los-blancos-con-la-cuna-roja`; fechas 1919–1919; relaciones 5; aliases: —.
- **Venus de Urbino** — `WORK` / `ARTWORK`; slug `venus-de-urbino`; fechas 1534–…; relaciones 9; aliases: —.
- **Venus de Willendorf** — `WORK` / `ARTWORK`; slug `venus-de-willendorf`; fechas -28000–-25000; relaciones 3; aliases: —.
- **Very Hungry God** — `WORK` / `ARTWORK`; slug `very-hungry-god`; fechas 2006–2006; relaciones 4; aliases: —.
- **Villa Savoye** — `WORK` / `ARTWORK`; slug `villa-savoye`; fechas 1929–1929; relaciones 5; aliases: —.
- **Violín y candela** — `WORK` / `ARTWORK`; slug `violin-y-candela`; fechas 1910–1910; relaciones 5; aliases: —.
- **Visión después del sermón** — `WORK` / `ARTWORK`; slug `vision-despues-del-sermon`; fechas 1888–1888; relaciones 5; aliases: —.

## 4. People Coverage

**Cantidad:** 201. Listado completo:

- **Agesandro de Rodas** — `PERSON` / `ARTIST`; slug `agesandro`; fechas -100–-1; relaciones 1; aliases: —.
- **Agnes Martin** — `PERSON` / `ARTIST`; slug `agnes-martin`; fechas 1912–2004; relaciones 4; aliases: —.
- **Agustín de Hipona** — `PERSON` / `ARTIST`; slug `agustin-de-hipona`; fechas 354–430; relaciones 2; aliases: —.
- **Ai Weiwei** — `PERSON` / `ARTIST`; slug `ai-weiwei`; fechas 1957–…; relaciones 6; aliases: —.
- **Albrecht Dürer** — `PERSON` / `ARTIST`; slug `albrecht-durer`; fechas 1471–1528; relaciones 4; aliases: —.
- **Alexander Calder** — `PERSON` / `ARTIST`; slug `alexander-calder`; fechas 1898–1976; relaciones 4; aliases: —.
- **Alfred Sisley** — `PERSON` / `ARTIST`; slug `alfred-sisley`; fechas 1839–1899; relaciones 4; aliases: —.
- **Alfred Stieglitz** — `PERSON` / `ARTIST`; slug `alfred-stieglitz`; fechas 1864–1946; relaciones 4; aliases: —.
- **Alice Neel** — `PERSON` / `ARTIST`; slug `alice-neel`; fechas 1900–1984; relaciones 4; aliases: —.
- **Amar Kanwar** — `PERSON` / `ARTIST`; slug `amara-kanwar`; fechas 1964–…; relaciones 4; aliases: —.
- **Andrea Mantegna** — `PERSON` / `ARTIST`; slug `andrea-mantegna`; fechas 1431–1506; relaciones 4; aliases: —.
- **Andy Warhol** — `PERSON` / `ARTIST`; slug `andy-warhol`; fechas 1928–1987; relaciones 4; aliases: —.
- **Angelica Kauffmann** — `PERSON` / `ARTIST`; slug `angelica-kauffmann`; fechas 1741–1807; relaciones 4; aliases: —.
- **Annibale Carracci** — `PERSON` / `ARTIST`; slug `annibale-carracci`; fechas 1560–1609; relaciones 4; aliases: —.
- **Antemio de Tralles** — `PERSON` / `ARTIST`; slug `antemio-de-tralles`; fechas 474–558; relaciones 1; aliases: —.
- **Antoine Watteau** — `PERSON` / `ARTIST`; slug `antonie-watteau`; fechas 1684–1721; relaciones 4; aliases: —.
- **Antonio Canova** — `PERSON` / `ARTIST`; slug `antonio-canova`; fechas 1757–1822; relaciones 4; aliases: —.
- **Apollodoro de Damasco** — `PERSON` / `ARTIST`; slug `apolodoro-de-damasco`; fechas 50–130; relaciones 1; aliases: —.
- **Aristóteles** — `PERSON` / `ARTIST`; slug `aristoteles`; fechas -384–-322; relaciones 7; aliases: —.
- **Artemisia Gentileschi** — `PERSON` / `ARTIST`; slug `artemisia-gentileschi`; fechas 1593–1656; relaciones 4; aliases: —.
- **Artistas de Djenné** — `PERSON` / `ARTIST`; slug `djenne-artists`; fechas —; relaciones 4; aliases: —.
- **Artistas del Reino de Benín** — `PERSON` / `ARTIST`; slug `benin-bronze-artists`; fechas —; relaciones 4; aliases: —.
- **Auguste Rodin** — `PERSON` / `ARTIST`; slug `auguste-rodin`; fechas 1840–1917; relaciones 4; aliases: —.
- **Bartolomé Esteban Murillo** — `PERSON` / `ARTIST`; slug `bartolome-esteban-murillo`; fechas 1617–1682; relaciones 4; aliases: —.
- **Beatriz González** — `PERSON` / `ARTIST`; slug `beatriz-gonzalez`; fechas 1938–…; relaciones 4; aliases: —.
- **Ben Shahn** — `PERSON` / `ARTIST`; slug `ben-shahn`; fechas 1898–1969; relaciones 4; aliases: —.
- **Berthe Morisot** — `PERSON` / `ARTIST`; slug `berthe-morisot`; fechas 1841–1895; relaciones 4; aliases: —.
- **Bridget Riley** — `PERSON` / `ARTIST`; slug `bridget-riley`; fechas 1931–…; relaciones 4; aliases: —.
- **Calícrates** — `PERSON` / `ARTIST`; slug `calicrates`; fechas -500–-420; relaciones 1; aliases: —.
- **Camille Pissarro** — `PERSON` / `ARTIST`; slug `camille-pissarro`; fechas 1830–1903; relaciones 4; aliases: —.
- **Canaletto** — `PERSON` / `ARTIST`; slug `canaletto`; fechas 1697–1768; relaciones 4; aliases: —.
- **Carlos Cruz-Diez** — `PERSON` / `ARTIST`; slug `carlos-cruz-diez`; fechas 1923–2019; relaciones 4; aliases: —.
- **Carrie Mae Weems** — `PERSON` / `ARTIST`; slug `carrie-mae-weems`; fechas 1953–…; relaciones 3; aliases: —.
- **Caspar David Friedrich** — `PERSON` / `ARTIST`; slug `caspar-david-friedrich`; fechas 1774–1840; relaciones 4; aliases: —.
- **Cildo Meireles** — `PERSON` / `ARTIST`; slug `cildo-meireles`; fechas 1948–…; relaciones 4; aliases: —.
- **Cindy Sherman** — `PERSON` / `ARTIST`; slug `cindy-sherman`; fechas 1954–…; relaciones 4; aliases: —.
- **Claes Oldenburg** — `PERSON` / `ARTIST`; slug `claes-oldenburg`; fechas 1929–2022; relaciones 4; aliases: —.
- **Claude Monet** — `PERSON` / `ARTIST`; slug `claude-monet`; fechas 1840–1926; relaciones 4; aliases: —.
- **Constantin Brâncuși** — `PERSON` / `ARTIST`; slug `constantin-brancusi`; fechas 1876–1957; relaciones 3; aliases: —.
- **Cy Twombly** — `PERSON` / `ARTIST`; slug `cy-twombly`; fechas 1928–2011; relaciones 4; aliases: —.
- **Dan Flavin** — `PERSON` / `ARTIST`; slug `dan-flavin`; fechas 1933–1996; relaciones 4; aliases: —.
- **David Alfaro Siqueiros** — `PERSON` / `ARTIST`; slug `david-alfaro-siqueiros`; fechas 1896–1974; relaciones 4; aliases: —.
- **Diego Rivera** — `PERSON` / `ARTIST`; slug `diego-rivera`; fechas 1886–1957; relaciones 4; aliases: —.
- **Diego Velázquez** — `PERSON` / `ARTIST`; slug `diego-velazquez`; fechas 1599–1660; relaciones 4; aliases: —.
- **Dionisio** — `PERSON` / `ARTIST`; slug `dionisio`; fechas 500–600; relaciones 4; aliases: —.
- **Do Ho Suh** — `PERSON` / `ARTIST`; slug `do-ho-suh`; fechas 1962–…; relaciones 4; aliases: —.
- **Doménikos Theotokópoulos** — `PERSON` / `ARTIST`; slug `el-greco`; fechas 1541–1614; relaciones 5; aliases: El Greco.
- **Donald Judd** — `PERSON` / `ARTIST`; slug `donald-judd`; fechas 1928–1994; relaciones 4; aliases: —.
- **Donatello** — `PERSON` / `ARTIST`; slug `donatello`; fechas 1386–1466; relaciones 4; aliases: —.
- **Dorothea Lange** — `PERSON` / `ARTIST`; slug `dorothea-lange`; fechas 1895–1965; relaciones 3; aliases: —.
- **Edgar Degas** — `PERSON` / `ARTIST`; slug `edgar-degas`; fechas 1834–1917; relaciones 4; aliases: —.
- **Egon Schiele** — `PERSON` / `ARTIST`; slug `egon-schiele`; fechas 1890–1918; relaciones 4; aliases: —.
- **El Anatsui** — `PERSON` / `ARTIST`; slug `el-anatsui`; fechas 1944–…; relaciones 4; aliases: —.
- **El Lissitzky** — `PERSON` / `ARTIST`; slug `el-lissitzky`; fechas 1890–1941; relaciones 4; aliases: —.
- **Elena Guro** — `PERSON` / `ARTIST`; slug `elena-guro`; fechas 1877–1913; relaciones 4; aliases: —.
- **Ernst Ludwig Kirchner** — `PERSON` / `ARTIST`; slug `ernst-ludwig-kirchner`; fechas 1880–1938; relaciones 4; aliases: —.
- **Eugène Delacroix** — `PERSON` / `ARTIST`; slug `eugene-delacroix`; fechas 1798–1863; relaciones 4; aliases: —.
- **Eva Hesse** — `PERSON` / `ARTIST`; slug `eva-hesse`; fechas 1936–1970; relaciones 4; aliases: —.
- **Fra Angelico** — `PERSON` / `ARTIST`; slug `fra-angelico`; fechas 1395–1455; relaciones 4; aliases: —.
- **Francis Picabia** — `PERSON` / `ARTIST`; slug `francis-picabia`; fechas 1879–1953; relaciones 4; aliases: —.
- **Francisco de Goya** — `PERSON` / `ARTIST`; slug `francisco-de-goya`; fechas 1746–1828; relaciones 5; aliases: —.
- **Frank Lloyd Wright** — `PERSON` / `ARTIST`; slug `frank-lloyd-wright`; fechas 1867–1959; relaciones 4; aliases: —.
- **Frans Hals** — `PERSON` / `ARTIST`; slug `frans-hals`; fechas 1582–1666; relaciones 4; aliases: —.
- **François Boucher** — `PERSON` / `ARTIST`; slug `francois-boucher`; fechas 1703–1770; relaciones 4; aliases: —.
- **Frida Kahlo** — `PERSON` / `ARTIST`; slug `frida-kahlo`; fechas 1907–1954; relaciones 5; aliases: —.
- **Georges Braque** — `PERSON` / `ARTIST`; slug `georges-braque`; fechas 1882–1963; relaciones 5; aliases: —.
- **Georges Seurat** — `PERSON` / `ARTIST`; slug `georges-seurat`; fechas 1859–1891; relaciones 4; aliases: —.
- **Georges de La Tour** — `PERSON` / `ARTIST`; slug `georges-de-la-tour`; fechas 1593–1652; relaciones 4; aliases: —.
- **Georgia O'Keeffe** — `PERSON` / `ARTIST`; slug `georgia-okeeffe`; fechas 1887–1986; relaciones 3; aliases: —.
- **Geta Brătescu** — `PERSON` / `ARTIST`; slug `geta-bratescu`; fechas 1926–2018; relaciones 4; aliases: —.
- **Giambologna** — `PERSON` / `ARTIST`; slug `giambologna`; fechas 1529–1608; relaciones 5; aliases: —.
- **Giorgione** — `PERSON` / `ARTIST`; slug `giorgione`; fechas 1477–1510; relaciones 4; aliases: —.
- **Giotto di Bondone** — `PERSON` / `ARTIST`; slug `giotto`; fechas 1267–1337; relaciones 4; aliases: —.
- **Guido Reni** — `PERSON` / `ARTIST`; slug `guido-reni`; fechas 1575–1642; relaciones 4; aliases: —.
- **Guillermo Kuitca** — `PERSON` / `ARTIST`; slug `guillermo-kuitca`; fechas 1961–…; relaciones 4; aliases: —.
- **Gustav Klimt** — `PERSON` / `ARTIST`; slug `gustav-klimt`; fechas 1862–1918; relaciones 5; aliases: —.
- **Gustave Courbet** — `PERSON` / `ARTIST`; slug `gustave-courbet`; fechas 1819–1877; relaciones 4; aliases: —.
- **Gustave Moreau** — `PERSON` / `ARTIST`; slug `gustave-moreau`; fechas 1826–1898; relaciones 4; aliases: —.
- **Hannah Höch** — `PERSON` / `ARTIST`; slug `hannah-hoch`; fechas 1889–1978; relaciones 4; aliases: —.
- **Hans Haacke** — `PERSON` / `ARTIST`; slug `hans-haacke`; fechas 1936–…; relaciones 4; aliases: —.
- **Helen Frankenthaler** — `PERSON` / `ARTIST`; slug `helen-frankenthaler`; fechas 1928–2011; relaciones 4; aliases: —.
- **Henri Cartier-Bresson** — `PERSON` / `ARTIST`; slug `henri-cartier-bresson`; fechas 1908–2004; relaciones 3; aliases: —.
- **Henri Matisse** — `PERSON` / `ARTIST`; slug `henri-matisse`; fechas 1869–1954; relaciones 4; aliases: —.
- **Henri de Toulouse-Lautrec** — `PERSON` / `ARTIST`; slug `toulouse-lautrec`; fechas 1864–1901; relaciones 4; aliases: —.
- **Henrike Naumann** — `PERSON` / `ARTIST`; slug `henrike-naumann`; fechas 1984–…; relaciones 4; aliases: —.
- **Hilma af Klint** — `PERSON` / `ARTIST`; slug `hilma-af-klint`; fechas 1862–1944; relaciones 3; aliases: —.
- **Hiroshi Sugimoto** — `PERSON` / `ARTIST`; slug `hiroshi-sugimoto`; fechas 1948–…; relaciones 4; aliases: —.
- **Homero** — `PERSON` / `ARTIST`; slug `homer`; fechas -800–-700; relaciones 4; aliases: —.
- **Honoré Daumier** — `PERSON` / `ARTIST`; slug `honore-daumier`; fechas 1808–1879; relaciones 4; aliases: —.
- **Hélio Oiticica** — `PERSON` / `ARTIST`; slug `heli-oiticica`; fechas 1937–1980; relaciones 1; aliases: —.
- **Ibrahim el-Salahi** — `PERSON` / `ARTIST`; slug `ibrahim-el-salahi`; fechas 1930–…; relaciones 4; aliases: —.
- **Ictino** — `PERSON` / `ARTIST`; slug `ictino`; fechas -500–-430; relaciones 1; aliases: —.
- **Isidoro de Mileto** — `PERSON` / `ARTIST`; slug `isidoro-de-mileto`; fechas 442–537; relaciones 1; aliases: —.
- **J. M. W. Turner** — `PERSON` / `ARTIST`; slug `jmw-turner`; fechas 1775–1851; relaciones 5; aliases: —.
- **Jackson Pollock** — `PERSON` / `ARTIST`; slug `jackson-pollock`; fechas 1912–1956; relaciones 4; aliases: —.
- **Jacques-Louis David** — `PERSON` / `ARTIST`; slug `jacques-louis-david`; fechas 1748–1825; relaciones 5; aliases: —.
- **Jan van Eyck** — `PERSON` / `ARTIST`; slug `jan-van-eyck`; fechas 1390–1441; relaciones 4; aliases: —.
- **Jasper Johns** — `PERSON` / `ARTIST`; slug `jasper-johns`; fechas 1930–…; relaciones 4; aliases: —.
- **Jean Fautrier** — `PERSON` / `ARTIST`; slug `jean-fautrier`; fechas 1898–1964; relaciones 4; aliases: —.
- **Jean-François Millet** — `PERSON` / `ARTIST`; slug `jean-francois-millet`; fechas 1814–1875; relaciones 4; aliases: —.
- **Jean-Honoré Fragonard** — `PERSON` / `ARTIST`; slug `jean-honore-fragonard`; fechas 1732–1806; relaciones 4; aliases: —.
- **Joan Miró** — `PERSON` / `ARTIST`; slug `joan-miro`; fechas 1893–1983; relaciones 4; aliases: —.
- **Johannes Vermeer** — `PERSON` / `ARTIST`; slug `johannes-vermeer`; fechas 1632–1675; relaciones 4; aliases: —.
- **John Constable** — `PERSON` / `ARTIST`; slug `john-constable`; fechas 1776–1837; relaciones 4; aliases: —.
- **Josef Albers** — `PERSON` / `ARTIST`; slug `josef-albers`; fechas 1888–1976; relaciones 4; aliases: —.
- **Joseph Kosuth** — `PERSON` / `ARTIST`; slug `joseph-kosuth`; fechas 1945–…; relaciones 1; aliases: —.
- **José de Ribera** — `PERSON` / `ARTIST`; slug `jose-de-ribera`; fechas 1591–1652; relaciones 4; aliases: —.
- **Judy Chicago** — `PERSON` / `ARTIST`; slug `judy-chicago`; fechas 1939–…; relaciones 4; aliases: —.
- **Katsushika Hokusai** — `PERSON` / `ARTIST`; slug `katsushika-hokusai`; fechas 1760–1849; relaciones 4; aliases: —.
- **Kazimir Malévich** — `PERSON` / `ARTIST`; slug `kazimir-malevich`; fechas 1879–1935; relaciones 4; aliases: —.
- **Le Corbusier** — `PERSON` / `ARTIST`; slug `le-corbusier`; fechas 1887–1965; relaciones 4; aliases: —.
- **Lee Krasner** — `PERSON` / `ARTIST`; slug `lee-krasner`; fechas 1908–1984; relaciones 4; aliases: —.
- **Leonardo da Vinci** — `PERSON` / `ARTIST`; slug `leonardo-da-vinci`; fechas 1452–1519; relaciones 5; aliases: —.
- **Liubov Popova** — `PERSON` / `ARTIST`; slug `liubov-popova`; fechas 1889–1924; relaciones 4; aliases: —.
- **Louise Bourgeois** — `PERSON` / `ARTIST`; slug `louise-bourgeois`; fechas 1911–2010; relaciones 4; aliases: —.
- **Lygia Clark** — `PERSON` / `ARTIST`; slug `lygia-clark`; fechas 1920–1988; relaciones 4; aliases: —.
- **Lygia Pape** — `PERSON` / `ARTIST`; slug `lygia-pape`; fechas 1927–2004; relaciones 4; aliases: —.
- **Lyonel Feininger** — `PERSON` / `ARTIST`; slug `lyonel-feininger`; fechas 1871–1956; relaciones 4; aliases: —.
- **László Moholy-Nagy** — `PERSON` / `ARTIST`; slug `laszlo-moholy-nagy`; fechas 1895–1946; relaciones 4; aliases: —.
- **Man Ray** — `PERSON` / `ARTIST`; slug `man-ray`; fechas 1890–1976; relaciones 4; aliases: —.
- **Manuela Ballester** — `PERSON` / `ARTIST`; slug `manuela-ballester`; fechas 1908–1994; relaciones 4; aliases: —.
- **Marcel Duchamp** — `PERSON` / `ARTIST`; slug `marcel-duchamp`; fechas 1887–1968; relaciones 4; aliases: —.
- **Marina Abramović** — `PERSON` / `ARTIST`; slug `marina-abramovic`; fechas 1946–…; relaciones 5; aliases: —.
- **Mark Rothko** — `PERSON` / `ARTIST`; slug `mark-rothko`; fechas 1903–1970; relaciones 4; aliases: —.
- **Marlene Dumas** — `PERSON` / `ARTIST`; slug `marlene-dumas`; fechas 1953–…; relaciones 4; aliases: —.
- **Martha Rosler** — `PERSON` / `ARTIST`; slug `martha-rosler`; fechas 1943–…; relaciones 4; aliases: —.
- **Mary Cassatt** — `PERSON` / `ARTIST`; slug `mary-cassatt`; fechas 1844–1926; relaciones 4; aliases: —.
- **Masaccio** — `PERSON` / `ARTIST`; slug `masaccio`; fechas 1401–1428; relaciones 4; aliases: —.
- **Max Ernst** — `PERSON` / `ARTIST`; slug `max-ernst`; fechas 1891–1976; relaciones 4; aliases: —.
- **Meret Oppenheim** — `PERSON` / `ARTIST`; slug `meret-oppenheim`; fechas 1913–1985; relaciones 4; aliases: —.
- **Michelangelo Merisi da Caravaggio** — `PERSON` / `ARTIST`; slug `caravaggio`; fechas 1571–1610; relaciones 4; aliases: Caravaggio.
- **Miguel Ángel** — `PERSON` / `ARTIST`; slug `miguel-angel`; fechas 1475–1564; relaciones 4; aliases: Michelangelo Buonarroti.
- **Mona Hatoum** — `PERSON` / `ARTIST`; slug `mona-hatoum`; fechas 1952–…; relaciones 4; aliases: —.
- **Monir Shahroudy Farmanfarmaian** — `PERSON` / `ARTIST`; slug `monir-shahroudy-farmanfarmaian`; fechas 1924–2019; relaciones 4; aliases: —.
- **Natalia Goncharova** — `PERSON` / `ARTIST`; slug `natalia-goncharova`; fechas 1881–1962; relaciones 4; aliases: —.
- **Odilon Redon** — `PERSON` / `ARTIST`; slug `odilon-redon`; fechas 1840–1916; relaciones 4; aliases: —.
- **Oskar Schlemmer** — `PERSON` / `ARTIST`; slug `oskar-schlemmer`; fechas 1888–1943; relaciones 4; aliases: —.
- **Oswald de Andrade** — `PERSON` / `ARTIST`; slug `oswald-de-andrade`; fechas 1890–1954; relaciones 3; aliases: —.
- **Pablo Picasso** — `PERSON` / `ARTIST`; slug `pablo-picasso`; fechas 1881–1973; relaciones 7; aliases: —.
- **Paul Cézanne** — `PERSON` / `ARTIST`; slug `paul-cezanne`; fechas 1839–1906; relaciones 5; aliases: —.
- **Paul Gauguin** — `PERSON` / `ARTIST`; slug `paul-gauguin`; fechas 1848–1903; relaciones 4; aliases: —.
- **Paul Klee** — `PERSON` / `ARTIST`; slug `paul-klee`; fechas 1879–1940; relaciones 4; aliases: —.
- **Peter Paul Rubens** — `PERSON` / `ARTIST`; slug `peter-paul-rubens`; fechas 1577–1640; relaciones 4; aliases: —.
- **Philip Guston** — `PERSON` / `ARTIST`; slug `philip-guston`; fechas 1913–1980; relaciones 4; aliases: —.
- **Piero della Francesca** — `PERSON` / `ARTIST`; slug `piero-della-francesca`; fechas 1415–1492; relaciones 4; aliases: —.
- **Pierre-Auguste Renoir** — `PERSON` / `ARTIST`; slug `pierre-auguste-renoir`; fechas 1841–1919; relaciones 4; aliases: —.
- **Piet Mondrian** — `PERSON` / `ARTIST`; slug `piet-mondrian`; fechas 1872–1944; relaciones 4; aliases: —.
- **Pieter Bruegel el Viejo** — `PERSON` / `ARTIST`; slug `pieter-bruegel`; fechas 1525–1569; relaciones 4; aliases: —.
- **Plinio el Viejo** — `PERSON` / `ARTIST`; slug `plinio-el-viejo`; fechas 23–79; relaciones 3; aliases: —.
- **Policleto** — `PERSON` / `ARTIST`; slug `policleto`; fechas -480–-420; relaciones 1; aliases: —.
- **Pontormo** — `PERSON` / `ARTIST`; slug `pontormo`; fechas 1494–1557; relaciones 4; aliases: —.
- **Rafael** — `PERSON` / `ARTIST`; slug `rafael`; fechas 1483–1520; relaciones 4; aliases: Raffaello Sanzio.
- **Raja Ravi Varma** — `PERSON` / `ARTIST`; slug `raja-ravi-varma`; fechas 1848–1906; relaciones 4; aliases: —.
- **Rembrandt van Rijn** — `PERSON` / `ARTIST`; slug `rembrandt`; fechas 1606–1669; relaciones 4; aliases: —.
- **Remedios Varo** — `PERSON` / `ARTIST`; slug `remedios-varo`; fechas 1908–1963; relaciones 4; aliases: —.
- **René Magritte** — `PERSON` / `ARTIST`; slug `rene-magritte`; fechas 1898–1967; relaciones 4; aliases: —.
- **Richard Serra** — `PERSON` / `ARTIST`; slug `richard-serra`; fechas 1938–2024; relaciones 4; aliases: —.
- **Robert Delaunay** — `PERSON` / `ARTIST`; slug `robert-delaunay`; fechas 1885–1941; relaciones 3; aliases: —.
- **Robert Morris** — `PERSON` / `ARTIST`; slug `robert-morris`; fechas 1931–2018; relaciones 4; aliases: —.
- **Robert Rauschenberg** — `PERSON` / `ARTIST`; slug `robert-rauschenberg`; fechas 1925–2008; relaciones 4; aliases: —.
- **Robert Smithson** — `PERSON` / `ARTIST`; slug `robert-smithson`; fechas 1938–1973; relaciones 4; aliases: —.
- **Romuald Hazoumè** — `PERSON` / `ARTIST`; slug `romuald-hazoume`; fechas 1962–…; relaciones 4; aliases: —.
- **Rosa Bonheur** — `PERSON` / `ARTIST`; slug `rosa-bonheur`; fechas 1822–1899; relaciones 4; aliases: —.
- **Ryue Nishizawa** — `PERSON` / `ARTIST`; slug `ryue-nishizawa`; fechas 1966–…; relaciones 4; aliases: —.
- **Salvador Dalí** — `PERSON` / `ARTIST`; slug `salvador-dali`; fechas 1904–1989; relaciones 5; aliases: —.
- **Sandro Botticelli** — `PERSON` / `ARTIST`; slug `sandro-botticelli`; fechas 1445–1510; relaciones 4; aliases: —.
- **Shahzia Sikander** — `PERSON` / `ARTIST`; slug `shahzia-sikander`; fechas 1969–…; relaciones 4; aliases: —.
- **Shigeru Ban** — `PERSON` / `ARTIST`; slug `shigeru-ban`; fechas 1957–…; relaciones 4; aliases: —.
- **Shirin Neshat** — `PERSON` / `ARTIST`; slug `shirin-neshat`; fechas 1957–…; relaciones 4; aliases: —.
- **Sokari Douglas Camp** — `PERSON` / `ARTIST`; slug `sokari-douglas-camp`; fechas 1958–…; relaciones 4; aliases: —.
- **Sol LeWitt** — `PERSON` / `ARTIST`; slug `sol-lewitt`; fechas 1928–2007; relaciones 4; aliases: —.
- **Sonia Delaunay** — `PERSON` / `ARTIST`; slug `sonia-delaunay`; fechas 1885–1979; relaciones 3; aliases: —.
- **Sophie Calle** — `PERSON` / `ARTIST`; slug `sophie-calle`; fechas 1953–…; relaciones 4; aliases: —.
- **Sophie Taeuber-Arp** — `PERSON` / `ARTIST`; slug `sophie-taeuber-arp`; fechas 1889–1943; relaciones 4; aliases: —.
- **Subodh Gupta** — `PERSON` / `ARTIST`; slug `subodh-gupta`; fechas 1964–…; relaciones 4; aliases: —.
- **Sófocles** — `PERSON` / `ARTIST`; slug `sophocles`; fechas -496–-406; relaciones 4; aliases: —.
- **Takashi Murakami** — `PERSON` / `ARTIST`; slug `takashi-murakami`; fechas 1962–…; relaciones 4; aliases: —.
- **Tarsila do Amaral** — `PERSON` / `ARTIST`; slug `tarsila-do-amaral`; fechas 1886–1973; relaciones 5; aliases: —.
- **Theaster Gates** — `PERSON` / `ARTIST`; slug `theaster-gates`; fechas 1973–…; relaciones 4; aliases: —.
- **Théodore Géricault** — `PERSON` / `ARTIST`; slug `theodore-gericault`; fechas 1791–1824; relaciones 4; aliases: —.
- **Tiziano Vecellio** — `PERSON` / `ARTIST`; slug `tiziano`; fechas 1488–1576; relaciones 4; aliases: Titian.
- **Tristan Tzara** — `PERSON` / `ARTIST`; slug `tristan-tzara`; fechas 1896–1963; relaciones 4; aliases: —.
- **Utagawa Hiroshige** — `PERSON` / `ARTIST`; slug `utagawa-hiroshige`; fechas 1797–1858; relaciones 4; aliases: —.
- **Vasily Vereshchagin** — `PERSON` / `ARTIST`; slug `vassily-vereshchagin`; fechas 1842–1904; relaciones 4; aliases: —.
- **Vincent van Gogh** — `PERSON` / `ARTIST`; slug `vincent-van-gogh`; fechas 1853–1890; relaciones 5; aliases: —.
- **Vitruvio** — `PERSON` / `ARTIST`; slug `vitruvio`; fechas -80–-15; relaciones 5; aliases: —.
- **Walid Beshty** — `PERSON` / `ARTIST`; slug `walid-beshty`; fechas 1976–…; relaciones 4; aliases: —.
- **Walter Gropius** — `PERSON` / `ARTIST`; slug `walter-gropius`; fechas 1883–1969; relaciones 4; aliases: —.
- **Wang Shu** — `PERSON` / `ARTIST`; slug `wang-shu`; fechas 1963–…; relaciones 4; aliases: —.
- **Wassily Kandinsky** — `PERSON` / `ARTIST`; slug `wassily-kandinsky`; fechas 1866–1944; relaciones 4; aliases: —.
- **Wifredo Lam** — `PERSON` / `ARTIST`; slug `wifredo-lam`; fechas 1902–1982; relaciones 4; aliases: —.
- **William Blake** — `PERSON` / `ARTIST`; slug `william-blake`; fechas 1757–1827; relaciones 4; aliases: —.
- **William Kentridge** — `PERSON` / `ARTIST`; slug `william-kentridge`; fechas 1955–…; relaciones 4; aliases: —.
- **William Morris** — `PERSON` / `ARTIST`; slug `william-morris`; fechas 1834–1896; relaciones 4; aliases: —.
- **Wolfgang Tillmans** — `PERSON` / `ARTIST`; slug `wolfgang-tillmans`; fechas 1968–…; relaciones 4; aliases: —.
- **Yayoi Kusama** — `PERSON` / `ARTIST`; slug `yayoi-kusama`; fechas 1929–…; relaciones 4; aliases: —.
- **Yoko Ono** — `PERSON` / `ARTIST`; slug `yoko-ono`; fechas 1933–…; relaciones 4; aliases: —.
- **Zanele Muholi** — `PERSON` / `ARTIST`; slug `zanele-muholi`; fechas 1972–…; relaciones 4; aliases: —.
- **Édouard Manet** — `PERSON` / `ARTIST`; slug `edouard-manet`; fechas 1832–1883; relaciones 4; aliases: —.
- **Émile Bernard** — `PERSON` / `ARTIST`; slug `emile-bernard`; fechas 1868–1941; relaciones 4; aliases: —.
- **Óscar Murillo** — `PERSON` / `ARTIST`; slug `oscar-murillo`; fechas 1986–…; relaciones 4; aliases: —.

Periodo aproximado por startYear: antes de 500: 13, 1800–1949: 114, 1950+: 25, 1400–1799: 42, sin fecha: 2, 500–1399: 5. Canon: predominan pintura y modernidad; también escultura, arquitectura, fotografía, teoría y prácticas contemporáneas. Hubs: Aristóteles (7), Pablo Picasso (7), Ai Weiwei (6), Doménikos Theotokópoulos (5), Francisco de Goya (5), Frida Kahlo (5), Georges Braque (5), Giambologna (5), Gustav Klimt (5), J. M. W. Turner (5), Jacques-Louis David (5), Leonardo da Vinci (5), Marina Abramović (5), Paul Cézanne (5), Salvador Dalí (5).

## 5. Work Coverage

**Cantidad:** 224. Listado completo:

- **Abaporu** — `WORK` / `ARTWORK`; slug `abaporu`; fechas 1928–…; relaciones 5; aliases: —.
- **Amistad** — `WORK` / `ARTWORK`; slug `amistad`; fechas 1963–1963; relaciones 5; aliases: —.
- **Antropofagia** — `WORK` / `ARTWORK`; slug `antropofagia`; fechas 1928–1928; relaciones 4; aliases: —.
- **Apuntes para la historia del arte** — `WORK` / `ARTWORK`; slug `apuntes-para-la-historia-del-arte`; fechas 1980–1980; relaciones 4; aliases: —.
- **Arco inclinado** — `WORK` / `ARTWORK`; slug `arco-inclinado`; fechas 1981–1981; relaciones 4; aliases: —.
- **Asunción de la Virgen** — `WORK` / `ARTWORK`; slug `asuncion-de-la-virgen-carracci`; fechas 1600–1600; relaciones 6; aliases: —.
- **Augusto de Prima Porta** — `WORK` / `ARTWORK`; slug `augusto-de-prima-porta`; fechas 20–20; relaciones 4; aliases: —.
- **Autorretrato** — `WORK` / `ARTWORK`; slug `self-portrait-angelica-kauffmann`; fechas 1770–1770; relaciones 5; aliases: —.
- **Autorretrato** — `WORK` / `ARTWORK`; slug `autorretrato-manuela-ballester`; fechas 1940–1940; relaciones 5; aliases: —.
- **Autorretrato con collar de espinas** — `WORK` / `ARTWORK`; slug `autorretrato-con-collar-de-espinas`; fechas 1940–…; relaciones 6; aliases: —.
- **Autorretrato con farol chino** — `WORK` / `ARTWORK`; slug `autorretrato-con-linterna`; fechas 1912–1912; relaciones 5; aliases: —.
- **Ballet triádico** — `WORK` / `ARTWORK`; slug `ballet-triadico`; fechas 1922–1922; relaciones 4; aliases: —.
- **Bandera** — `WORK` / `ARTWORK`; slug `bandera`; fechas 1955–1955; relaciones 6; aliases: —.
- **Blue Print** — `WORK` / `ARTWORK`; slug `blue-print`; fechas 2005–2005; relaciones 4; aliases: —.
- **Boulevard Montmartre** — `WORK` / `ARTWORK`; slug `boulevard-montmartre`; fechas 1897–1897; relaciones 6; aliases: —.
- **Bretonas en el prado** — `WORK` / `ARTWORK`; slug `bretonas-en-el-prado`; fechas 1888–1888; relaciones 4; aliases: —.
- **Bronces de Benín** — `WORK` / `ARTWORK`; slug `bronces-de-benin`; fechas 1500–1800; relaciones 7; aliases: —.
- **Busto de Nefertiti** — `WORK` / `ARTWORK`; slug `busto-de-nefertiti`; fechas -1345–…; relaciones 12; aliases: —.
- **Cage** — `WORK` / `ARTWORK`; slug `cage`; fechas 1990–1990; relaciones 4; aliases: —.
- **Calle de Berlín** — `WORK` / `ARTWORK`; slug `calle-de-berlin`; fechas 1913–1913; relaciones 5; aliases: —.
- **Campanile de Giotto** — `WORK` / `ARTWORK`; slug `campanile-de-giotto`; fechas 1334–1334; relaciones 6; aliases: —.
- **Cartel de la guerra** — `WORK` / `ARTWORK`; slug `cartel-de-la-guerra`; fechas 1943–1943; relaciones 6; aliases: —.
- **Casa de la Cascada** — `WORK` / `ARTWORK`; slug `casa-sobre-la-cascada`; fechas 1935–1939; relaciones 13; aliases: —.
- **Catarata** — `WORK` / `ARTWORK`; slug `catarata`; fechas 1967–1967; relaciones 4; aliases: —.
- **Catedral de Chartres** — `WORK` / `ARTWORK`; slug `catedral-de-chartres`; fechas 1194–1220; relaciones 7; aliases: —.
- **Cazadores en la nieve** — `WORK` / `ARTWORK`; slug `cazadores-en-la-nieve`; fechas 1565–1565; relaciones 5; aliases: —.
- **Columna de Trajano** — `WORK` / `ARTWORK`; slug `columna-de-trajano`; fechas 113–113; relaciones 6; aliases: —.
- **Composición** — `WORK` / `ARTWORK`; slug `composicion`; fechas 1955–1955; relaciones 4; aliases: —.
- **Composición VIII** — `WORK` / `ARTWORK`; slug `composicion-viii`; fechas 1923–…; relaciones 4; aliases: —.
- **Composición con rojo, azul y amarillo** — `WORK` / `ARTWORK`; slug `composicion-rojo-azul-amarillo`; fechas 1930–1930; relaciones 5; aliases: —.
- **Contingente** — `WORK` / `ARTWORK`; slug `contingente`; fechas 1969–1969; relaciones 5; aliases: —.
- **Corte con el cuchillo de cocina** — `WORK` / `ARTWORK`; slug `corte-con-el-cuchillo-de-cocina`; fechas 1919–1919; relaciones 5; aliases: —.
- **Creación de las aves** — `WORK` / `ARTWORK`; slug `creacion-de-las-aves`; fechas 1957–1957; relaciones 5; aliases: —.
- **Cristo Pantocrátor** — `WORK` / `ARTWORK`; slug `icono-de-cristo-pantocrator`; fechas 1100–1100; relaciones 4; aliases: —.
- **Cuadrado negro** — `WORK` / `ARTWORK`; slug `cuadrado-negro`; fechas 1915–…; relaciones 4; aliases: —.
- **Cuadro negro** — `WORK` / `ARTWORK`; slug `cuadro-negro-popova`; fechas 1918–1918; relaciones 4; aliases: —.
- **Cut Piece** — `WORK` / `ARTWORK`; slug `cut-piece`; fechas 1964–…; relaciones 4; aliases: —.
- **Cámara de los esposos** — `WORK` / `ARTWORK`; slug `camera-degli-sposi`; fechas 1474–1474; relaciones 4; aliases: —.
- **Código de Hammurabi** — `WORK` / `ARTWORK`; slug `codigo-de-hammurabi`; fechas -1750–-1750; relaciones 3; aliases: —.
- **Dama con lámpara** — `WORK` / `ARTWORK`; slug `dama-con-lampara`; fechas 1900–…; relaciones 8; aliases: —.
- **Dama en la calle** — `WORK` / `ARTWORK`; slug `dama-en-la-calle`; fechas 1920–1920; relaciones 8; aliases: —.
- **Danza vertical** — `WORK` / `ARTWORK`; slug `danza-vertical`; fechas 1926–1926; relaciones 4; aliases: —.
- **David** — `WORK` / `ARTWORK`; slug `david-de-miguel-angel`; fechas 1501–1504; relaciones 12; aliases: —.
- **Detrás de la estación Saint-Lazare** — `WORK` / `ARTWORK`; slug `detrás-de-la-estacion-saint-lazare`; fechas 1932–…; relaciones 7; aliases: —.
- **Dibujo mural 118** — `WORK` / `ARTWORK`; slug `dibujo-mural-118`; fechas 1971–1971; relaciones 5; aliases: —.
- **Discóbolo** — `WORK` / `ARTWORK`; slug `discobolo`; fechas -450–-450; relaciones 3; aliases: —.
- **Divisor** — `WORK` / `ARTWORK`; slug `divisor`; fechas 1968–1968; relaciones 6; aliases: —.
- **Dorchester Projects** — `WORK` / `ARTWORK`; slug `dorchester-projects`; fechas 2009–2009; relaciones 5; aliases: —.
- **Doríforo** — `WORK` / `ARTWORK`; slug `doryphoros`; fechas -450–-440; relaciones 9; aliases: —.
- **Dos niños amenazados por un ruiseñor** — `WORK` / `ARTWORK`; slug `dos-ninos-amenazados-por-un-ruisenor`; fechas 1924–1924; relaciones 5; aliases: —.
- **Double Plot** — `WORK` / `ARTWORK`; slug `otobong-nkanga`; fechas 1978–1978; relaciones 4; aliases: —.
- **Díptico de Marilyn** — `WORK` / `ARTWORK`; slug `diptico-marilyn`; fechas 1962–…; relaciones 11; aliases: —.
- **Eco de un grito** — `WORK` / `ARTWORK`; slug `eco-de-un-grito`; fechas 1937–1937; relaciones 5; aliases: —.
- **Edificio Bauhaus de Dessau** — `WORK` / `ARTWORK`; slug `edificio-bauhaus-dessau`; fechas 1925–1926; relaciones 12; aliases: —.
- **El 3 de mayo de 1808** — `WORK` / `ARTWORK`; slug `tres-de-mayo-1808`; fechas 1814–…; relaciones 12; aliases: —.
- **El Gran Canal** — `WORK` / `ARTWORK`; slug `canaletto-gran-canal`; fechas 1730–…; relaciones 4; aliases: —.
- **El almuerzo de los remeros** — `WORK` / `ARTWORK`; slug `almuerzo-de-los-remeros`; fechas 1881–…; relaciones 8; aliases: —.
- **El anciano de los días** — `WORK` / `ARTWORK`; slug `el-anciano-de-los-dias`; fechas 1794–1794; relaciones 5; aliases: —.
- **El banquete de Cleopatra** — `WORK` / `ARTWORK`; slug `el-banquete-de-cleopatra`; fechas 1747–1747; relaciones 6; aliases: —.
- **El barco de esclavos** — `WORK` / `ARTWORK`; slug `el-barco-de-esclavos`; fechas 1840–…; relaciones 5; aliases: —.
- **El baño del niño** — `WORK` / `ARTWORK`; slug `el-bano-del-nino`; fechas 1893–1893; relaciones 5; aliases: —.
- **El beso** — `WORK` / `ARTWORK`; slug `el-beso-klimt`; fechas 1907–1908; relaciones 4; aliases: —.
- **El caballero sonriente** — `WORK` / `ARTWORK`; slug `caballero-sonriente`; fechas 1624–1624; relaciones 4; aliases: —.
- **El caminante sobre el mar de nubes** — `WORK` / `ARTWORK`; slug `el-caminante-sobre-el-mar-de-nubes`; fechas 1818–1818; relaciones 6; aliases: —.
- **El carnaval del arlequín** — `WORK` / `ARTWORK`; slug `carnaval-del-arlequin`; fechas 1924–1924; relaciones 5; aliases: —.
- **El ciclista** — `WORK` / `ARTWORK`; slug `el-ciclista`; fechas 1913–1913; relaciones 4; aliases: —.
- **El columpio** — `WORK` / `ARTWORK`; slug `el-columpio`; fechas 1768–1768; relaciones 4; aliases: —.
- **El entierro del conde de Orgaz** — `WORK` / `ARTWORK`; slug `entierro-del-conde-de-orgaz`; fechas 1586–1588; relaciones 8; aliases: —.
- **El hijo del hombre** — `WORK` / `ARTWORK`; slug `el-hijo-del-hombre`; fechas 1964–…; relaciones 4; aliases: —.
- **El hombre en la encrucijada** — `WORK` / `ARTWORK`; slug `hombre-en-la-encrucijada`; fechas 1934–…; relaciones 10; aliases: —.
- **El juramento de los Horacios** — `WORK` / `ARTWORK`; slug `juramento-de-los-horacios`; fechas 1784–…; relaciones 10; aliases: —.
- **El mar** — `WORK` / `ARTWORK`; slug `el-mar`; fechas 1990–1990; relaciones 4; aliases: —.
- **El nacimiento de Venus** — `WORK` / `ARTWORK`; slug `el-nacimiento-de-venus`; fechas 1484–1486; relaciones 13; aliases: —.
- **El ojo como globo extraño** — `WORK` / `ARTWORK`; slug `el-ojo-como-globo-extrano`; fechas 1882–1882; relaciones 4; aliases: —.
- **El patizambo** — `WORK` / `ARTWORK`; slug `el-pie-zambo`; fechas 1642–1642; relaciones 5; aliases: —.
- **El pensador** — `WORK` / `ARTWORK`; slug `el-pensador`; fechas 1904–…; relaciones 7; aliases: —.
- **El pequeño camello** — `WORK` / `ARTWORK`; slug `el-pequeno-camello`; fechas 1910–1910; relaciones 5; aliases: —.
- **El vagón de tercera clase** — `WORK` / `ARTWORK`; slug `el-tranvia-de-tercera-clase`; fechas 1864–1864; relaciones 4; aliases: —.
- **Embarcadero espiral** — `WORK` / `ARTWORK`; slug `spiral-jetty`; fechas 1970–1970; relaciones 5; aliases: —.
- **Equivalentes** — `WORK` / `ARTWORK`; slug `equivalentes`; fechas 1923–1923; relaciones 8; aliases: —.
- **Escultura blanda** — `WORK` / `ARTWORK`; slug `soft-sculpture`; fechas 1962–1962; relaciones 6; aliases: —.
- **Estela de Naram-Sin** — `WORK` / `ARTWORK`; slug `estela-de-naram-sin`; fechas -2254–-2218; relaciones 6; aliases: —.
- **Estudio para el juramento de los Horacios** — `WORK` / `ARTWORK`; slug `el-juramento-de-los-horacios-estudio`; fechas 1784–1784; relaciones 6; aliases: —.
- **Faces and Phases** — `WORK` / `ARTWORK`; slug `faces-and-phases`; fechas 2010–2010; relaciones 10; aliases: —.
- **Felix en el exilio** — `WORK` / `ARTWORK`; slug `felix-en-el-exilio`; fechas 1994–1994; relaciones 5; aliases: —.
- **Fiesta de amor** — `WORK` / `ARTWORK`; slug `fiesta-de-amor`; fechas 1717–1717; relaciones 4; aliases: —.
- **Fisicromía** — `WORK` / `ARTWORK`; slug `fisicromia`; fechas 1965–1965; relaciones 4; aliases: —.
- **Fleshly Sight** — `WORK` / `ARTWORK`; slug `fleshly-sight`; fechas 2004–2004; relaciones 4; aliases: —.
- **Freischwimmer** — `WORK` / `ARTWORK`; slug `freischwimmer`; fechas 2004–2004; relaciones 8; aliases: —.
- **From Here I Saw What Happened** — `WORK` / `ARTWORK`; slug `from-here-i-saw-what-happened`; fechas 1995–…; relaciones 12; aliases: —.
- **Fuente** — `WORK` / `ARTWORK`; slug `fuente`; fechas 1917–…; relaciones 10; aliases: —.
- **Fumarolas** — `WORK` / `ARTWORK`; slug `fumarolas`; fechas 1964–1964; relaciones 4; aliases: —.
- **Gran Mezquita de Djenné** — `WORK` / `ARTWORK`; slug `gran-mezquita-de-djenne`; fechas 1907–…; relaciones 10; aliases: —.
- **Gran Mezquita de Samarra** — `WORK` / `ARTWORK`; slug `mezquita-de-samarra`; fechas 851–851; relaciones 5; aliases: —.
- **Guernica** — `WORK` / `ARTWORK`; slug `guernica`; fechas 1937–…; relaciones 18; aliases: —.
- **Hipómenes y Atalanta** — `WORK` / `ARTWORK`; slug `hipomenes-y-atlanta`; fechas 1618–1618; relaciones 6; aliases: —.
- **Homenaje al cuadrado** — `WORK` / `ARTWORK`; slug `homenaje-al-cuadrado`; fechas 1950–1950; relaciones 4; aliases: —.
- **Hot Spot** — `WORK` / `ARTWORK`; slug `hot-spot`; fechas 2006–2006; relaciones 6; aliases: —.
- **Impresión, sol naciente** — `WORK` / `ARTWORK`; slug `impresion-sol-naciente`; fechas 1872–…; relaciones 8; aliases: —.
- **Infinity Mirrored Room** — `WORK` / `ARTWORK`; slug `infinity-mirrored-room`; fechas 1965–…; relaciones 7; aliases: —.
- **Inmaculada de Soult** — `WORK` / `ARTWORK`; slug `inmaculada-de-soult`; fechas 1678–1678; relaciones 5; aliases: —.
- **Inserción en circuitos ideológicos** — `WORK` / `ARTWORK`; slug `insertion-into-circuit`; fechas 1970–1970; relaciones 6; aliases: —.
- **Jimson Weed** — `WORK` / `ARTWORK`; slug `jimson-weed`; fechas 1936–1936; relaciones 4; aliases: —.
- **Judith y su doncella** — `WORK` / `ARTWORK`; slug `judith-y-su-doncella`; fechas 1614–1614; relaciones 5; aliases: —.
- **Júpiter y Sémele** — `WORK` / `ARTWORK`; slug `jupiter-y-semele`; fechas 1894–1894; relaciones 5; aliases: —.
- **La Anunciación** — `WORK` / `ARTWORK`; slug `la-anunciacion-fra-angelico`; fechas 1438–1438; relaciones 5; aliases: —.
- **La Gioconda** — `WORK` / `ARTWORK`; slug `mona-lisa`; fechas 1503–1519; relaciones 12; aliases: Mona Lisa.
- **La Libertad guiando al pueblo** — `WORK` / `ARTWORK`; slug `libertad-guiando-al-pueblo`; fechas 1830–…; relaciones 7; aliases: —.
- **La Magdalena penitente** — `WORK` / `ARTWORK`; slug `la-magdalena-penitente`; fechas 1640–1640; relaciones 4; aliases: —.
- **La Virgen del cuello largo** — `WORK` / `ARTWORK`; slug `la-virgen-del-cuello-largo`; fechas 1535–1535; relaciones 6; aliases: —.
- **La apoteosis de la guerra** — `WORK` / `ARTWORK`; slug `la-porcion-de-la-guerra`; fechas 1871–1871; relaciones 6; aliases: —.
- **La balsa de la Medusa** — `WORK` / `ARTWORK`; slug `la-balsa-de-la-medusa`; fechas 1819–1819; relaciones 6; aliases: —.
- **La bouche du temps** — `WORK` / `ARTWORK`; slug `la-boca-del-tiempo`; fechas 2004–2004; relaciones 4; aliases: —.
- **La carreta de heno** — `WORK` / `ARTWORK`; slug `el-carro-de-heno`; fechas 1821–1821; relaciones 5; aliases: —.
- **La ciudad al final del mundo** — `WORK` / `ARTWORK`; slug `la-ciudad-al-final-del-mundo`; fechas 1928–1928; relaciones 4; aliases: —.
- **La clase de danza** — `WORK` / `ARTWORK`; slug `la-clase-de-danza`; fechas 1874–…; relaciones 4; aliases: —.
- **La corriente del Golfo** — `WORK` / `ARTWORK`; slug `la-corriente-del-golfo`; fechas 1899–1899; relaciones 5; aliases: —.
- **La cuna** — `WORK` / `ARTWORK`; slug `la-cuna`; fechas 1872–1872; relaciones 5; aliases: —.
- **La danza** — `WORK` / `ARTWORK`; slug `la-danza-matisse`; fechas 1910–1910; relaciones 5; aliases: —.
- **La elevación de la cruz** — `WORK` / `ARTWORK`; slug `elevacion-de-la-cruz`; fechas 1610–1610; relaciones 5; aliases: —.
- **La escuela de Atenas** — `WORK` / `ARTWORK`; slug `escuela-de-atenas`; fechas 1509–1511; relaciones 12; aliases: —.
- **La expulsión del paraíso** — `WORK` / `ARTWORK`; slug `la-expulsion-del-paraiso`; fechas 1427–1427; relaciones 4; aliases: —.
- **La feria de caballos** — `WORK` / `ARTWORK`; slug `la-feria-de-caballos`; fechas 1853–1853; relaciones 5; aliases: —.
- **La flagelación de Cristo** — `WORK` / `ARTWORK`; slug `flagelacion-de-cristo`; fechas 1455–1455; relaciones 4; aliases: —.
- **La gran ola de Kanagawa** — `WORK` / `ARTWORK`; slug `gran-ola-de-kanagawa`; fechas 1831–…; relaciones 15; aliases: —.
- **La inundación en Port-Marly** — `WORK` / `ARTWORK`; slug `la-inundacion-en-port-marly`; fechas 1876–1876; relaciones 6; aliases: —.
- **La joven de la perla** — `WORK` / `ARTWORK`; slug `joven-de-la-perla`; fechas 1665–…; relaciones 10; aliases: —.
- **La jungla** — `WORK` / `ARTWORK`; slug `la-jungla-lam`; fechas 1943–…; relaciones 8; aliases: —.
- **La noche estrellada** — `WORK` / `ARTWORK`; slug `noche-estrellada`; fechas 1889–…; relaciones 11; aliases: —.
- **La persistencia de la memoria** — `WORK` / `ARTWORK`; slug `la-persistencia-de-la-memoria`; fechas 1931–…; relaciones 7; aliases: —.
- **La ronda de noche** — `WORK` / `ARTWORK`; slug `ronda-de-noche`; fechas 1642–…; relaciones 8; aliases: —.
- **La tempestad** — `WORK` / `ARTWORK`; slug `la-tempestad`; fechas 1508–1508; relaciones 4; aliases: —.
- **La vocación de san Mateo** — `WORK` / `ARTWORK`; slug `vocacion-de-san-mateo`; fechas 1599–1600; relaciones 9; aliases: —.
- **La última cena** — `WORK` / `ARTWORK`; slug `ultima-cena`; fechas 1495–1498; relaciones 11; aliases: —.
- **Laocoonte y sus hijos** — `WORK` / `ARTWORK`; slug `laocoonte`; fechas -50–…; relaciones 7; aliases: —.
- **Las Meninas** — `WORK` / `ARTWORK`; slug `las-meninas`; fechas 1656–…; relaciones 15; aliases: —.
- **Las dos Fridas** — `WORK` / `ARTWORK`; slug `las-dos-fridas`; fechas 1939–…; relaciones 13; aliases: —.
- **Las espigadoras** — `WORK` / `ARTWORK`; slug `las-espigadoras`; fechas 1857–1857; relaciones 6; aliases: —.
- **Las señoritas de Aviñón** — `WORK` / `ARTWORK`; slug `las-senoritas-de-avignon`; fechas 1907–…; relaciones 8; aliases: —.
- **Lluvia repentina sobre el puente Ohashi** — `WORK` / `ARTWORK`; slug `lluvia-repentina-sobre-el-puente-ohashi`; fechas 1857–…; relaciones 10; aliases: —.
- **Lluvia, vapor y velocidad** — `WORK` / `ARTWORK`; slug `vapor-y-nubes-de-steam-boat`; fechas 1844–…; relaciones 7; aliases: —.
- **Los diez mayores** — `WORK` / `ARTWORK`; slug `los-diez-mayores`; fechas 1907–1907; relaciones 4; aliases: —.
- **Los girasoles** — `WORK` / `ARTWORK`; slug `los-girasoles`; fechas 1888–…; relaciones 8; aliases: —.
- **Los guerreros** — `WORK` / `ARTWORK`; slug `los-guerreros`; fechas 1960–1960; relaciones 4; aliases: —.
- **Lunar Caustic** — `WORK` / `ARTWORK`; slug `lunar-caustic`; fechas 1920–1920; relaciones 4; aliases: —.
- **Líneas de Nazca** — `WORK` / `ARTWORK`; slug `lineas-de-nazca`; fechas -200–600; relaciones 5; aliases: —.
- **Madame de Pompadour** — `WORK` / `ARTWORK`; slug `madame-de-pompadour`; fechas 1756–1756; relaciones 5; aliases: —.
- **Madre migrante** — `WORK` / `ARTWORK`; slug `migrant-mother`; fechas 1936–…; relaciones 12; aliases: —.
- **Magdalena** — `WORK` / `ARTWORK`; slug `magdalena`; fechas 1995–1995; relaciones 6; aliases: —.
- **Maman** — `WORK` / `ARTWORK`; slug `maman`; fechas 1999–…; relaciones 13; aliases: —.
- **Manhattan Real Estate Holdings** — `WORK` / `ARTWORK`; slug `manhattan-real-estate-holdings`; fechas 1971–1971; relaciones 6; aliases: —.
- **Melancolía I** — `WORK` / `ARTWORK`; slug `melancolia-i`; fechas 1514–1514; relaciones 5; aliases: —.
- **Mezquita Azul** — `WORK` / `ARTWORK`; slug `mezquita-azul`; fechas 1609–1616; relaciones 3; aliases: —.
- **Mezquita de Córdoba** — `WORK` / `ARTWORK`; slug `gran-mezquita-de-cordoba`; fechas 785–…; relaciones 6; aliases: —.
- **Mirror Ball** — `WORK` / `ARTWORK`; slug `mirror-ball`; fechas 1970–1970; relaciones 6; aliases: —.
- **Modern Magic** — `WORK` / `ARTWORK`; slug `modern-magic`; fechas 2017–2017; relaciones 6; aliases: —.
- **Modulador espacio-luz** — `WORK` / `ARTWORK`; slug `modulador-espacio-luz`; fechas 1930–1930; relaciones 4; aliases: —.
- **Monograma** — `WORK` / `ARTWORK`; slug `monograma`; fechas 1955–1955; relaciones 6; aliases: —.
- **Mont Sainte-Victoire** — `WORK` / `ARTWORK`; slug `mont-sainte-victoire`; fechas 1904–1906; relaciones 9; aliases: —.
- **Montañas y mar** — `WORK` / `ARTWORK`; slug `montanas-y-mar`; fechas 1952–1952; relaciones 4; aliases: —.
- **Monumento para V. Tatlin** — `WORK` / `ARTWORK`; slug `monumento-para-v`; fechas 1964–1964; relaciones 4; aliases: —.
- **Moulin Rouge: La Goulue** — `WORK` / `ARTWORK`; slug `moulin-rouge-la-goulue`; fechas 1891–1891; relaciones 4; aliases: —.
- **Museo de Ningbo** — `WORK` / `ARTWORK`; slug `museo-de-ningbo`; fechas 2008–2008; relaciones 5; aliases: —.
- **Máquina de trinar** — `WORK` / `ARTWORK`; slug `maquina-de-trinar`; fechas 1922–1922; relaciones 5; aliases: —.
- **Móvil rojo** — `WORK` / `ARTWORK`; slug `mobile-calder-rojo`; fechas 1956–…; relaciones 4; aliases: —.
- **Narrativa no lineal** — `WORK` / `ARTWORK`; slug `no-linear-narrative`; fechas 2004–2004; relaciones 5; aliases: —.
- **Número 14** — `WORK` / `ARTWORK`; slug `numero-14`; fechas 1960–…; relaciones 4; aliases: —.
- **Número 1A, 1948** — `WORK` / `ARTWORK`; slug `numero-1a`; fechas 1948–…; relaciones 4; aliases: —.
- **Objeto para ser destruido** — `WORK` / `ARTWORK`; slug `objeto-para-ser-destruido`; fechas 1931–…; relaciones 4; aliases: —.
- **Olympia** — `WORK` / `ARTWORK`; slug `olympia`; fechas 1863–…; relaciones 13; aliases: —.
- **One and Three Chairs** — `WORK` / `ARTWORK`; slug `obra-de-arte-en-el-tiempo`; fechas 1965–…; relaciones 4; aliases: —.
- **Palacio de Versalles** — `WORK` / `ARTWORK`; slug `palacio-de-versailles`; fechas 1661–1715; relaciones 3; aliases: —.
- **Panteón de Roma** — `WORK` / `ARTWORK`; slug `panteon-de-roma`; fechas 118–128; relaciones 7; aliases: —.
- **Paper Church** — `WORK` / `ARTWORK`; slug `paper-church`; fechas 1995–1995; relaciones 4; aliases: —.
- **Partenón** — `WORK` / `ARTWORK`; slug `partenon`; fechas -447–-432; relaciones 7; aliases: —.
- **Piedra del Sol** — `WORK` / `ARTWORK`; slug `piedra-del-sol`; fechas 1479–1521; relaciones 4; aliases: —.
- **Pinturas de Lascaux** — `WORK` / `ARTWORK`; slug `cueva-de-lascaux`; fechas -17000–…; relaciones 6; aliases: —.
- **Prismas eléctricos** — `WORK` / `ARTWORK`; slug `prismas-electricos`; fechas 1914–1914; relaciones 4; aliases: —.
- **Psique reanimada por el beso** — `WORK` / `ARTWORK`; slug `psique-reanimada-por-el-beso`; fechas 1787–1787; relaciones 8; aliases: —.
- **Puerta de Ishtar** — `WORK` / `ARTWORK`; slug `puerta-de-ishtar`; fechas -575–-575; relaciones 5; aliases: —.
- **Pájaro en el espacio** — `WORK` / `ARTWORK`; slug `pajaro-en-el-espacio`; fechas 1928–1928; relaciones 4; aliases: —.
- **Rapto de las sabinas** — `WORK` / `ARTWORK`; slug `rapto-de-las-sabinas`; fechas 1583–1583; relaciones 8; aliases: —.
- **Rayografía** — `WORK` / `ARTWORK`; slug `rayografia`; fechas 1922–1922; relaciones 8; aliases: —.
- **Red House** — `WORK` / `ARTWORK`; slug `red-house-morris`; fechas 1860–1860; relaciones 5; aliases: —.
- **Rehenes** — `WORK` / `ARTWORK`; slug `otages-fautrier`; fechas 1945–1945; relaciones 5; aliases: —.
- **Retrato de Adele Bloch-Bauer I** — `WORK` / `ARTWORK`; slug `retrato-de-adele-bloch-bauer`; fechas 1907–…; relaciones 6; aliases: —.
- **Retrato de Giovanni Arnolfini** — `WORK` / `ARTWORK`; slug `retrato-de-giovanni-arnolfini`; fechas 1434–1434; relaciones 5; aliases: —.
- **Retrato de Manuela** — `WORK` / `ARTWORK`; slug `retrato-de-manuela`; fechas 1965–1965; relaciones 6; aliases: —.
- **Rhythm 0** — `WORK` / `ARTWORK`; slug `rhythm-0`; fechas 1974–…; relaciones 3; aliases: —.
- **San Jorge** — `WORK` / `ARTWORK`; slug `san-jorge-donato`; fechas 1417–1417; relaciones 6; aliases: —.
- **Santa Sofía** — `WORK` / `ARTWORK`; slug `hagia-sophia`; fechas 532–537; relaciones 8; aliases: —.
- **Saturno devorando a su hijo** — `WORK` / `ARTWORK`; slug `saturno-devorando-a-su-hijo`; fechas 1820–1823; relaciones 8; aliases: —.
- **Seascapes** — `WORK` / `ARTWORK`; slug `seascapes`; fechas 1980–1980; relaciones 10; aliases: —.
- **Semillas de girasol** — `WORK` / `ARTWORK`; slug `semillas-de-girasol`; fechas 2010–…; relaciones 9; aliases: —.
- **Semiotics of the Kitchen** — `WORK` / `ARTWORK`; slug `semiotica-de-la-cocina`; fechas 1975–1975; relaciones 6; aliases: —.
- **Seoul Home** — `WORK` / `ARTWORK`; slug `seul-hogar`; fechas 1999–1999; relaciones 4; aliases: —.
- **Shibboleth** — `WORK` / `ARTWORK`; slug `shibboleth`; fechas 2007–…; relaciones 6; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-twombly`; fechas 1968–1968; relaciones 4; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-morris`; fechas 1965–1965; relaciones 4; aliases: —.
- **Sin título** — `WORK` / `ARTWORK`; slug `sin-titulo-judd`; fechas 1969–1969; relaciones 5; aliases: —.
- **Suite Vénitienne** — `WORK` / `ARTWORK`; slug `suite-veneciana`; fechas 1980–1980; relaciones 4; aliases: —.
- **Tan Tan Bo** — `WORK` / `ARTWORK`; slug `tan-tan-bo`; fechas 2001–2001; relaciones 6; aliases: —.
- **Tapiz de Bayeux** — `WORK` / `ARTWORK`; slug `tapiz-de-bayeux`; fechas 1066–1077; relaciones 5; aliases: —.
- **Teatro de Epidauro** — `WORK` / `ARTWORK`; slug `teatro-de-epidauro`; fechas -340–-340; relaciones 6; aliases: —.
- **Teléfono langosta** — `WORK` / `ARTWORK`; slug `lobster-telephone`; fechas 1938–…; relaciones 4; aliases: —.
- **Templo de Kukulkán** — `WORK` / `ARTWORK`; slug `templo-de-kukulcan`; fechas 800–1000; relaciones 5; aliases: —.
- **The Body as Archive** — `WORK` / `ARTWORK`; slug `cuerpo-como-archivo`; fechas 1998–…; relaciones 3; aliases: —.
- **The Cleaner** — `WORK` / `ARTWORK`; slug `the-cleaner`; fechas 2015–2015; relaciones 6; aliases: —.
- **The Dinner Party** — `WORK` / `ARTWORK`; slug `the-dinner-party`; fechas 1979–1979; relaciones 6; aliases: —.
- **The Last Sound** — `WORK` / `ARTWORK`; slug `the-last-sound`; fechas 1964–1964; relaciones 4; aliases: —.
- **The Trees** — `WORK` / `ARTWORK`; slug `the-trees`; fechas 2009–2009; relaciones 4; aliases: —.
- **Tierra desarrollando más raíces** — `WORK` / `ARTWORK`; slug `tierra-desarrollando-mas-raices`; fechas 2018–2018; relaciones 5; aliases: —.
- **Torre Eiffel** — `WORK` / `ARTWORK`; slug `torre-eiffel-robert-delaunay`; fechas 1911–1911; relaciones 3; aliases: —.
- **Tropicália** — `WORK` / `ARTWORK`; slug `tropicalia-obra`; fechas 1967–…; relaciones 6; aliases: —.
- **Un entierro en Ornans** — `WORK` / `ARTWORK`; slug `entierro-en-ornans`; fechas 1849–1850; relaciones 6; aliases: —.
- **Una tarde de domingo** — `WORK` / `ARTWORK`; slug `una-tarde-de-domingo`; fechas 1886–1886; relaciones 6; aliases: —.
- **Untitled Film Still #21** — `WORK` / `ARTWORK`; slug `untitled-film-still-21`; fechas 1978–…; relaciones 8; aliases: —.
- **Vence a los blancos con la cuña roja** — `WORK` / `ARTWORK`; slug `vence-a-los-blancos-con-la-cuna-roja`; fechas 1919–1919; relaciones 5; aliases: —.
- **Venus de Urbino** — `WORK` / `ARTWORK`; slug `venus-de-urbino`; fechas 1534–…; relaciones 9; aliases: —.
- **Venus de Willendorf** — `WORK` / `ARTWORK`; slug `venus-de-willendorf`; fechas -28000–-25000; relaciones 3; aliases: —.
- **Very Hungry God** — `WORK` / `ARTWORK`; slug `very-hungry-god`; fechas 2006–2006; relaciones 4; aliases: —.
- **Villa Savoye** — `WORK` / `ARTWORK`; slug `villa-savoye`; fechas 1929–1929; relaciones 5; aliases: —.
- **Violín y candela** — `WORK` / `ARTWORK`; slug `violin-y-candela`; fechas 1910–1910; relaciones 5; aliases: —.
- **Visión después del sermón** — `WORK` / `ARTWORK`; slug `vision-despues-del-sermon`; fechas 1888–1888; relaciones 5; aliases: —.

### Obras por autor

- **Aristóteles** (4): Código de Hammurabi, Discóbolo, Gran Mezquita de Samarra, Puerta de Ishtar.
- **Cindy Sherman** (2): The Body as Archive, Untitled Film Still #21.
- **Francisco de Goya** (2): El 3 de mayo de 1808, Saturno devorando a su hijo.
- **Frida Kahlo** (2): Autorretrato con collar de espinas, Las dos Fridas.
- **Giambologna** (2): El banquete de Cleopatra, Rapto de las sabinas.
- **Gustav Klimt** (2): El beso, Retrato de Adele Bloch-Bauer I.
- **J. M. W. Turner** (2): El barco de esclavos, Lluvia, vapor y velocidad.
- **Jacques-Louis David** (2): El juramento de los Horacios, Estudio para el juramento de los Horacios.
- **Leonardo da Vinci** (2): La Gioconda, La última cena.
- **Pablo Picasso** (2): Guernica, Las señoritas de Aviñón.
- **Salvador Dalí** (2): La persistencia de la memoria, Teléfono langosta.
- **Vincent van Gogh** (2): La noche estrellada, Los girasoles.
- **Vitruvio** (2): Augusto de Prima Porta, Columna de Trajano.
- **Agesandro de Rodas** (1): Laocoonte y sus hijos.
- **Agnes Martin** (1): Amistad.
- **Ai Weiwei** (1): Semillas de girasol.
- **Albrecht Dürer** (1): Melancolía I.
- **Alexander Calder** (1): Móvil rojo.
- **Alfred Sisley** (1): La inundación en Port-Marly.
- **Alfred Stieglitz** (1): Equivalentes.
- **Alice Neel** (1): Retrato de Manuela.
- **Amar Kanwar** (1): Narrativa no lineal.
- **Andrea Mantegna** (1): Cámara de los esposos.
- **Andy Warhol** (1): Díptico de Marilyn.
- **Angelica Kauffmann** (1): Autorretrato.
- **Annibale Carracci** (1): Asunción de la Virgen.
- **Antemio de Tralles** (1): Santa Sofía.
- **Antoine Watteau** (1): Fiesta de amor.
- **Antonio Canova** (1): Psique reanimada por el beso.
- **Apollodoro de Damasco** (1): Panteón de Roma.
- **Arte islámico** (1): Mezquita Azul.
- **Artemisia Gentileschi** (1): Judith y su doncella.
- **Artistas de Djenné** (1): Gran Mezquita de Djenné.
- **Artistas del Reino de Benín** (1): Bronces de Benín.
- **Auguste Rodin** (1): El pensador.
- **Bartolomé Esteban Murillo** (1): Inmaculada de Soult.
- **Beatriz González** (1): Apuntes para la historia del arte.
- **Ben Shahn** (1): Cartel de la guerra.
- **Berthe Morisot** (1): La cuna.
- **Bridget Riley** (1): Catarata.
- **Calícrates** (1): Partenón.
- **Camille Pissarro** (1): Boulevard Montmartre.
- **Canaletto** (1): El Gran Canal.
- **Carlos Cruz-Diez** (1): Fisicromía.
- **Carrie Mae Weems** (1): From Here I Saw What Happened.
- **Caspar David Friedrich** (1): El caminante sobre el mar de nubes.
- **Cildo Meireles** (1): Inserción en circuitos ideológicos.
- **Claes Oldenburg** (1): Escultura blanda.
- **Claude Monet** (1): Impresión, sol naciente.
- **Constantin Brâncuși** (1): Pájaro en el espacio.
- **Cy Twombly** (1): Sin título.
- **Dan Flavin** (1): Monumento para V. Tatlin.
- **David Alfaro Siqueiros** (1): Eco de un grito.
- **Diego Rivera** (1): El hombre en la encrucijada.
- **Diego Velázquez** (1): Las Meninas.
- **Dionisio** (1): Cristo Pantocrátor.
- **Do Ho Suh** (1): Seoul Home.
- **Doménikos Theotokópoulos** (1): El entierro del conde de Orgaz.
- **Donald Judd** (1): Sin título.
- **Donatello** (1): San Jorge.
- **Dorothea Lange** (1): Madre migrante.
- **Edgar Degas** (1): La clase de danza.
- **Egon Schiele** (1): Autorretrato con farol chino.
- **El Anatsui** (1): Tierra desarrollando más raíces.
- **El Lissitzky** (1): Vence a los blancos con la cuña roja.
- **Elena Guro** (1): El pequeño camello.
- **Ernst Ludwig Kirchner** (1): Calle de Berlín.
- **Eugène Delacroix** (1): La Libertad guiando al pueblo.
- **Eva Hesse** (1): Contingente.
- **Fra Angelico** (1): La Anunciación.
- **Francis Picabia** (1): Dama en la calle.
- **Frank Lloyd Wright** (1): Casa de la Cascada.
- **Frans Hals** (1): El caballero sonriente.
- **François Boucher** (1): Madame de Pompadour.
- **Georges Braque** (1): Violín y candela.
- **Georges Seurat** (1): Una tarde de domingo.
- **Georges de La Tour** (1): La Magdalena penitente.
- **Georgia O'Keeffe** (1): Jimson Weed.
- **Geta Brătescu** (1): Double Plot.
- **Giorgione** (1): La tempestad.
- **Giotto di Bondone** (1): Campanile de Giotto.
- **Guido Reni** (1): Hipómenes y Atalanta.
- **Guillermo Kuitca** (1): El mar.
- **Gustave Courbet** (1): Un entierro en Ornans.
- **Gustave Moreau** (1): Júpiter y Sémele.
- **Hannah Höch** (1): Corte con el cuchillo de cocina.
- **Hans Haacke** (1): Manhattan Real Estate Holdings.
- **Helen Frankenthaler** (1): Montañas y mar.
- **Henri Cartier-Bresson** (1): Detrás de la estación Saint-Lazare.
- **Henri Matisse** (1): La danza.
- **Henri de Toulouse-Lautrec** (1): Moulin Rouge: La Goulue.
- **Henrike Naumann** (1): Modern Magic.
- **Hilma af Klint** (1): Los diez mayores.
- **Hiroshi Sugimoto** (1): Seascapes.
- **Homero** (1): La corriente del Golfo.
- **Honoré Daumier** (1): El vagón de tercera clase.
- **Hélio Oiticica** (1): Tropicália.
- **Ibrahim el-Salahi** (1): The Last Sound.
- **Ictino** (1): Partenón.
- **Isidoro de Mileto** (1): Santa Sofía.
- **Jackson Pollock** (1): Número 1A, 1948.
- **Jan van Eyck** (1): Retrato de Giovanni Arnolfini.
- **Jasper Johns** (1): Bandera.
- **Jean Fautrier** (1): Rehenes.
- **Jean-François Millet** (1): Las espigadoras.
- **Jean-Honoré Fragonard** (1): El columpio.
- **Joan Miró** (1): El carnaval del arlequín.
- **Johannes Vermeer** (1): La joven de la perla.
- **John Constable** (1): La carreta de heno.
- **Josef Albers** (1): Homenaje al cuadrado.
- **Joseph Kosuth** (1): One and Three Chairs.
- **José de Ribera** (1): El patizambo.
- **Judy Chicago** (1): The Dinner Party.
- **Katsushika Hokusai** (1): La gran ola de Kanagawa.
- **Kazimir Malévich** (1): Cuadrado negro.
- **Le Corbusier** (1): Villa Savoye.
- **Lee Krasner** (1): Composición.
- **Liubov Popova** (1): Cuadro negro.
- **Louise Bourgeois** (1): Maman.
- **Lygia Clark** (1): Los guerreros.
- **Lygia Pape** (1): Divisor.
- **Lyonel Feininger** (1): La ciudad al final del mundo.
- **László Moholy-Nagy** (1): Modulador espacio-luz.
- **Man Ray** (1): Rayografía.
- **Manuela Ballester** (1): Autorretrato.
- **Marcel Duchamp** (1): Fuente.
- **Marina Abramović** (1): Rhythm 0.
- **Mark Rothko** (1): Número 14.
- **Marlene Dumas** (1): Magdalena.
- **Martha Rosler** (1): Semiotics of the Kitchen.
- **Mary Cassatt** (1): El baño del niño.
- **Masaccio** (1): La expulsión del paraíso.
- **Max Ernst** (1): Dos niños amenazados por un ruiseñor.
- **Meret Oppenheim** (1): Objeto para ser destruido.
- **Michelangelo Merisi da Caravaggio** (1): La vocación de san Mateo.
- **Miguel Ángel** (1): David.
- **Mona Hatoum** (1): Hot Spot.
- **Monir Shahroudy Farmanfarmaian** (1): Mirror Ball.
- **Natalia Goncharova** (1): El ciclista.
- **Odilon Redon** (1): El ojo como globo extraño.
- **Oskar Schlemmer** (1): Ballet triádico.
- **Oswald de Andrade** (1): Antropofagia.
- **Paul Cézanne** (1): Mont Sainte-Victoire.
- **Paul Gauguin** (1): Visión después del sermón.
- **Paul Klee** (1): Máquina de trinar.
- **Peter Paul Rubens** (1): La elevación de la cruz.
- **Philip Guston** (1): Fumarolas.
- **Piero della Francesca** (1): La flagelación de Cristo.
- **Pierre-Auguste Renoir** (1): El almuerzo de los remeros.
- **Piet Mondrian** (1): Composición con rojo, azul y amarillo.
- **Pieter Bruegel el Viejo** (1): Cazadores en la nieve.
- **Policleto** (1): Doríforo.
- **Pontormo** (1): La Virgen del cuello largo.
- **Rafael** (1): La escuela de Atenas.
- **Raja Ravi Varma** (1): Dama con lámpara.
- **Rembrandt van Rijn** (1): La ronda de noche.
- **Remedios Varo** (1): Creación de las aves.
- **René Magritte** (1): El hijo del hombre.
- **Richard Serra** (1): Arco inclinado.
- **Robert Delaunay** (1): Torre Eiffel.
- **Robert Morris** (1): Sin título.
- **Robert Rauschenberg** (1): Monograma.
- **Robert Smithson** (1): Embarcadero espiral.
- **Rococo** (1): Palacio de Versalles.
- **Romuald Hazoumè** (1): La bouche du temps.
- **Rosa Bonheur** (1): La feria de caballos.
- **Ryue Nishizawa** (1): The Trees.
- **Sandro Botticelli** (1): El nacimiento de Venus.
- **Shahzia Sikander** (1): Fleshly Sight.
- **Shigeru Ban** (1): Paper Church.
- **Shirin Neshat** (1): Shibboleth.
- **Sokari Douglas Camp** (1): Cage.
- **Sol LeWitt** (1): Dibujo mural 118.
- **Sonia Delaunay** (1): Prismas eléctricos.
- **Sophie Calle** (1): Suite Vénitienne.
- **Sophie Taeuber-Arp** (1): Danza vertical.
- **Subodh Gupta** (1): Very Hungry God.
- **Sófocles** (1): Teatro de Epidauro.
- **Takashi Murakami** (1): Tan Tan Bo.
- **Tarsila do Amaral** (1): Abaporu.
- **Theaster Gates** (1): Dorchester Projects.
- **Théodore Géricault** (1): La balsa de la Medusa.
- **Tiziano Vecellio** (1): Venus de Urbino.
- **Tristan Tzara** (1): Lunar Caustic.
- **Utagawa Hiroshige** (1): Lluvia repentina sobre el puente Ohashi.
- **Vasily Vereshchagin** (1): La apoteosis de la guerra.
- **Walid Beshty** (1): Blue Print.
- **Walter Gropius** (1): Edificio Bauhaus de Dessau.
- **Wang Shu** (1): Museo de Ningbo.
- **Wassily Kandinsky** (1): Composición VIII.
- **Wifredo Lam** (1): La jungla.
- **William Blake** (1): El anciano de los días.
- **William Kentridge** (1): Felix en el exilio.
- **William Morris** (1): Red House.
- **Wolfgang Tillmans** (1): Freischwimmer.
- **Yayoi Kusama** (1): Infinity Mirrored Room.
- **Yoko Ono** (1): Cut Piece.
- **Zanele Muholi** (1): Faces and Phases.
- **Édouard Manet** (1): Olympia.
- **Émile Bernard** (1): Bretonas en el prado.
- **Óscar Murillo** (1): The Cleaner.

Más conectadas (18): Guernica (18). Menos conectadas (3): Código de Hammurabi (3), Discóbolo (3), Mezquita Azul (3), Palacio de Versalles (3), Rhythm 0 (3). WORK con creator estructural: 214/224; sin creator explícito: Busto de Nefertiti (12), Catedral de Chartres (7), Estela de Naram-Sin (6), Líneas de Nazca (5), Mezquita de Córdoba (6), Piedra del Sol (4), Pinturas de Lascaux (6), Tapiz de Bayeux (5), Templo de Kukulkán (5), Venus de Willendorf (3). WORK casi aisladas (≤2): —.

## 6. Movements & Periods

### Periodos

- **Paleolítico** — `ABSTRACTION` / `PERIOD`; slug `paleolitico`; fechas -3000000–-10000; relaciones 3; aliases: —.
- **Neolítico** — `ABSTRACTION` / `PERIOD`; slug `neolitico`; fechas -10000–-3000; relaciones 1; aliases: —.
- **Antigüedad** — `ABSTRACTION` / `PERIOD`; slug `antiguedad`; fechas -3500–500; relaciones 52; aliases: —.
- **Edad Media** — `ABSTRACTION` / `PERIOD`; slug `edad-media`; fechas 500–1400; relaciones 13; aliases: —.
- **Renacimiento** — `ABSTRACTION` / `PERIOD`; slug `renacimiento`; fechas 1400–1600; relaciones 31; aliases: —.
- **Edad Moderna** — `ABSTRACTION` / `PERIOD`; slug `edad-moderna`; fechas 1500–1800; relaciones 42; aliases: —.
- **Siglo XIX** — `ABSTRACTION` / `PERIOD`; slug `siglo-xix`; fechas 1801–1900; relaciones 92; aliases: —.
- **Siglo XX** — `ABSTRACTION` / `PERIOD`; slug `siglo-xx`; fechas 1901–2000; relaciones 213; aliases: —.
- **Siglo XXI** — `ABSTRACTION` / `PERIOD`; slug `siglo-xxi`; fechas 2001–…; relaciones 1; aliases: —.

### Movimientos / escuelas / corrientes / estilos

- **Arquitectura moderna** — `ABSTRACTION` / `MOVEMENT`; slug `arquitectura-moderna`; fechas —; relaciones 12; aliases: —.
- **Art Nouveau** — `ABSTRACTION` / `MOVEMENT`; slug `art-nouveau`; fechas —; relaciones 8; aliases: —.
- **Arte africano** — `ABSTRACTION` / `MOVEMENT`; slug `arte-africano`; fechas —; relaciones 15; aliases: —.
- **Arte andino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-andino`; fechas —; relaciones 4; aliases: —.
- **Arte bizantino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-bizantino`; fechas —; relaciones 6; aliases: —.
- **Arte chino** — `ABSTRACTION` / `MOVEMENT`; slug `arte-chino`; fechas —; relaciones 5; aliases: —.
- **Arte conceptual** — `ABSTRACTION` / `MOVEMENT`; slug `arte-conceptual`; fechas —; relaciones 57; aliases: —.
- **Arte de performance** — `ABSTRACTION` / `MOVEMENT`; slug `arte-performance`; fechas —; relaciones 3; aliases: —.
- **Arte egipcio** — `ABSTRACTION` / `MOVEMENT`; slug `arte-egipcio`; fechas —; relaciones 4; aliases: —.
- **Arte griego** — `ABSTRACTION` / `MOVEMENT`; slug `arte-griego`; fechas —; relaciones 14; aliases: —.
- **Arte indio** — `ABSTRACTION` / `MOVEMENT`; slug `arte-indio`; fechas —; relaciones 11; aliases: —.
- **Arte islámico** — `ABSTRACTION` / `MOVEMENT`; slug `arte-islamico`; fechas —; relaciones 7; aliases: —.
- **Arte maya** — `ABSTRACTION` / `MOVEMENT`; slug `arte-maya`; fechas —; relaciones 3; aliases: —.
- **Arte mesopotámico** — `ABSTRACTION` / `MOVEMENT`; slug `arte-mesopotamico`; fechas —; relaciones 5; aliases: —.
- **Arte mexica** — `ABSTRACTION` / `MOVEMENT`; slug `arte-mexica`; fechas —; relaciones 5; aliases: —.
- **Arte romano** — `ABSTRACTION` / `MOVEMENT`; slug `arte-romano`; fechas —; relaciones 10; aliases: —.
- **Arte rupestre** — `ABSTRACTION` / `MOVEMENT`; slug `arte-rupestre`; fechas —; relaciones 4; aliases: —.
- **Arts and Crafts** — `ABSTRACTION` / `MOVEMENT`; slug `arts-and-crafts`; fechas —; relaciones 5; aliases: —.
- **Barroco** — `ABSTRACTION` / `MOVEMENT`; slug `barroco`; fechas —; relaciones 27; aliases: —.
- **Bauhaus** — `ABSTRACTION` / `MOVEMENT`; slug `bauhaus-movement`; fechas —; relaciones 17; aliases: —.
- **Constructivismo** — `ABSTRACTION` / `MOVEMENT`; slug `constructivismo`; fechas —; relaciones 10; aliases: —.
- **Cubismo** — `ABSTRACTION` / `MOVEMENT`; slug `cubismo`; fechas —; relaciones 13; aliases: —.
- **Dadaísmo** — `ABSTRACTION` / `MOVEMENT`; slug `dadaismo`; fechas —; relaciones 20; aliases: —.
- **De Stijl** — `ABSTRACTION` / `MOVEMENT`; slug `de-stijl`; fechas —; relaciones 4; aliases: —.
- **Expresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `expresionismo`; fechas —; relaciones 7; aliases: —.
- **Expresionismo abstracto** — `ABSTRACTION` / `MOVEMENT`; slug `expresionismo-abstracto`; fechas —; relaciones 15; aliases: —.
- **Fauvismo** — `ABSTRACTION` / `MOVEMENT`; slug `fauvismo`; fechas —; relaciones 5; aliases: —.
- **Fluxus** — `ABSTRACTION` / `MOVEMENT`; slug `fluxus`; fechas —; relaciones 4; aliases: —.
- **Fotografía moderna** — `ABSTRACTION` / `MOVEMENT`; slug `fotografia-moderna`; fechas —; relaciones 10; aliases: —.
- **Futurismo** — `ABSTRACTION` / `MOVEMENT`; slug `futurismo`; fechas —; relaciones 7; aliases: —.
- **Gótico** — `ABSTRACTION` / `MOVEMENT`; slug `gotico`; fechas —; relaciones 5; aliases: —.
- **Impresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `impresionismo`; fechas —; relaciones 18; aliases: —.
- **Informalismo** — `ABSTRACTION` / `MOVEMENT`; slug `informalismo`; fechas —; relaciones 4; aliases: —.
- **Land Art** — `ABSTRACTION` / `MOVEMENT`; slug `land-art`; fechas —; relaciones 4; aliases: —.
- **Manierismo** — `ABSTRACTION` / `MOVEMENT`; slug `manierismo`; fechas —; relaciones 8; aliases: —.
- **Minimalismo** — `ABSTRACTION` / `MOVEMENT`; slug `minimalismo`; fechas —; relaciones 17; aliases: —.
- **Modernismo brasileño** — `ABSTRACTION` / `MOVEMENT`; slug `modernismo-brasileno`; fechas —; relaciones 1; aliases: —.
- **Muralismo mexicano** — `ABSTRACTION` / `MOVEMENT`; slug `muralismo-mexicano`; fechas —; relaciones 13; aliases: —.
- **Neoclasicismo** — `ABSTRACTION` / `MOVEMENT`; slug `neoclasicismo`; fechas —; relaciones 13; aliases: —.
- **Orfismo** — `ABSTRACTION` / `MOVEMENT`; slug `orfismo`; fechas —; relaciones 4; aliases: —.
- **Pop Art** — `ABSTRACTION` / `MOVEMENT`; slug `pop-art`; fechas —; relaciones 12; aliases: —.
- **Postimpresionismo** — `ABSTRACTION` / `MOVEMENT`; slug `postimpresionismo`; fechas —; relaciones 18; aliases: —.
- **Realismo** — `ABSTRACTION` / `MOVEMENT`; slug `realismo`; fechas —; relaciones 23; aliases: —.
- **Renacimiento italiano** — `ABSTRACTION` / `MOVEMENT`; slug `renacimiento-italiano`; fechas —; relaciones 28; aliases: —.
- **Renacimiento nórdico** — `ABSTRACTION` / `MOVEMENT`; slug `renacimiento-nordico`; fechas —; relaciones 8; aliases: —.
- **Rococo** — `ABSTRACTION` / `MOVEMENT`; slug `rococo`; fechas —; relaciones 12; aliases: —.
- **Romanticismo** — `ABSTRACTION` / `MOVEMENT`; slug `romanticismo`; fechas —; relaciones 19; aliases: —.
- **Románico** — `ABSTRACTION` / `MOVEMENT`; slug `romanico`; fechas —; relaciones 3; aliases: —.
- **Simbolismo** — `ABSTRACTION` / `MOVEMENT`; slug `simbolismo`; fechas —; relaciones 8; aliases: —.
- **Suprematismo** — `ABSTRACTION` / `MOVEMENT`; slug `suprematismo`; fechas —; relaciones 6; aliases: —.
- **Surrealismo** — `ABSTRACTION` / `MOVEMENT`; slug `surrealismo`; fechas —; relaciones 22; aliases: —.
- **Ukiyo-e** — `ABSTRACTION` / `MOVEMENT`; slug `ukiyo-e`; fechas —; relaciones 8; aliases: —.

### Mapa cronológico

- **Paleolítico:** 3 entidades conectadas.
- **Neolítico:** 1 entidades conectadas.
- **Antigüedad:** 52 entidades conectadas.
- **Edad Media:** 13 entidades conectadas.
- **Renacimiento:** 31 entidades conectadas.
- **Edad Moderna:** 42 entidades conectadas.
- **Siglo XIX:** 92 entidades conectadas.
- **Siglo XX:** 213 entidades conectadas.
- **Siglo XXI:** 1 entidades conectadas.

## 7. Concepts

**179 conceptos transversales existentes:**

- **Representación** — 218 conexiones; personas: Aristóteles (7); obras: Las Meninas (15), La Gioconda (12), Amistad (5); atraviesa: Ciudad (40), Materialidad (28), Cuerpo (19).
- **Ciudad** — 40 conexiones; personas: —; obras: Guernica (18), Casa de la Cascada (13); atraviesa: Representación (218).
- **Fotografía** — 28 conexiones; personas: Cindy Sherman (4), Carrie Mae Weems (3), Dorothea Lange (3); obras: From Here I Saw What Happened (12), Madre migrante (12), Faces and Phases (10); atraviesa: Tecnología (6).
- **Materialidad** — 28 conexiones; personas: —; obras: Maman (13), Semillas de girasol (9); atraviesa: Representación (218), Mármol (16), Película fotográfica (12).
- **Religión** — 28 conexiones; personas: Agustín de Hipona (2); obras: El nacimiento de Venus (13), La escuela de Atenas (12), La última cena (11); atraviesa: Arte indio (11), Arte islámico (7), Arte bizantino (6).
- **Cuerpo** — 19 conexiones; personas: —; obras: Las Meninas (15), Las dos Fridas (13), Olympia (13); atraviesa: Representación (218), Arte griego (14), Manierismo (8).
- **Autoría** — 18 conexiones; personas: —; obras: Fuente (10), Infinity Mirrored Room (7), Bandera (6); atraviesa: Representación (218), Arte conceptual (57), Dadaísmo (20).
- **Mito** — 18 conexiones; personas: —; obras: El nacimiento de Venus (13), La escuela de Atenas (12), La última cena (11); atraviesa: Representación (218).
- **Naturaleza** — 18 conexiones; personas: —; obras: La gran ola de Kanagawa (15), La noche estrellada (11), Lluvia repentina sobre el puente Ohashi (10); atraviesa: Representación (218), Romanticismo (19), Land Art (4).
- **Paisaje** — 17 conexiones; personas: —; obras: La gran ola de Kanagawa (15), La noche estrellada (11), Lluvia repentina sobre el puente Ohashi (10); atraviesa: Representación (218), Ukiyo-e (8).
- **Reproducción** — 17 conexiones; personas: —; obras: Fuente (10), Infinity Mirrored Room (7), Bandera (6); atraviesa: Representación (218), Pop Art (12).
- **Retrato** — 17 conexiones; personas: —; obras: Las Meninas (15), Las dos Fridas (13), Olympia (13); atraviesa: Arte romano (10), Renacimiento nórdico (8).
- **Espacio público** — 15 conexiones; personas: —; obras: Casa de la Cascada (13), Edificio Bauhaus de Dessau (12), Gran Mezquita de Djenné (10); atraviesa: Representación (218).
- **Arquitectura** — 14 conexiones; personas: —; obras: Casa de la Cascada (13), Edificio Bauhaus de Dessau (12), Gran Mezquita de Djenné (10); atraviesa: —.
- **Memoria** — 12 conexiones; personas: —; obras: Guernica (18), Madre migrante (12), Faces and Phases (10); atraviesa: Representación (218).
- **Guerra** — 11 conexiones; personas: —; obras: Guernica (18), El 3 de mayo de 1808 (12), From Here I Saw What Happened (12); atraviesa: —.
- **Violencia** — 11 conexiones; personas: —; obras: Guernica (18), El 3 de mayo de 1808 (12), From Here I Saw What Happened (12); atraviesa: —.
- **Abstracción** — 10 conexiones; personas: Constantin Brâncuși (3), Georgia O'Keeffe (3), Hilma af Klint (3); obras: Composición VIII (4), Jimson Weed (4), Los diez mayores (4); atraviesa: Cubismo (13), Suprematismo (6), De Stijl (4).
- **Ritual** — 7 conexiones; personas: —; obras: Pinturas de Lascaux (6); atraviesa: Representación (218), Arte africano (15), Arte chino (5).
- **Poder** — 6 conexiones; personas: —; obras: Estela de Naram-Sin (6), Palacio de Versalles (3); atraviesa: Barroco (27), Muralismo mexicano (13), Arte mesopotámico (5).
- **Tecnología** — 6 conexiones; personas: —; obras: —; atraviesa: Representación (218), Fotografía (28), Bauhaus (17).
- **Performance** — 5 conexiones; personas: Marina Abramović (5); obras: Rhythm 0 (3); atraviesa: Barroco (27), Fluxus (4), Arte de performance (3).
- **Belleza** — 4 conexiones; personas: —; obras: El nacimiento de Venus (13), La Gioconda (12); atraviesa: Representación (218), Arte griego (14).
- **Identidad** — 4 conexiones; personas: —; obras: Las dos Fridas (13), Autorretrato con collar de espinas (6); atraviesa: Representación (218), Renacimiento italiano (28).
- **Imperio** — 4 conexiones; personas: —; obras: Piedra del Sol (4); atraviesa: Representación (218), Arte romano (10), Arte mexica (5).
- **Lujo** — 4 conexiones; personas: —; obras: Retrato de Adele Bloch-Bauer I (6), Palacio de Versalles (3); atraviesa: Representación (218), Rococo (12).
- **Modernidad** — 4 conexiones; personas: Oswald de Andrade (3); obras: —; atraviesa: Impresionismo (18), Cubismo (13).
- **Máquina** — 4 conexiones; personas: —; obras: Casa de la Cascada (13), Edificio Bauhaus de Dessau (12); atraviesa: Representación (218), Futurismo (7).
- **Revolución** — 4 conexiones; personas: —; obras: Guernica (18), La Libertad guiando al pueblo (7); atraviesa: Representación (218).
- **Trabajo** — 4 conexiones; personas: —; obras: Madre migrante (12), El hombre en la encrucijada (10); atraviesa: Representación (218), Realismo (23).
- **Tradición** — 4 conexiones; personas: —; obras: La gran ola de Kanagawa (15), Busto de Nefertiti (12); atraviesa: Representación (218), Neoclasicismo (13).
- **Archivo** — 3 conexiones; personas: —; obras: Guernica (18), From Here I Saw What Happened (12); atraviesa: Representación (218).
- **Autorretrato** — 3 conexiones; personas: —; obras: Las dos Fridas (13), Autorretrato con collar de espinas (6); atraviesa: Representación (218).
- **Cine** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), La persistencia de la memoria (7); atraviesa: Representación (218).
- **Clase social** — 3 conexiones; personas: —; obras: Las Meninas (15), Madre migrante (12); atraviesa: Representación (218).
- **Colonialismo** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), El barco de esclavos (5); atraviesa: Representación (218).
- **Color** — 3 conexiones; personas: —; obras: —; atraviesa: Representación (218), Postimpresionismo (18), Fauvismo (5).
- **Comunidad** — 3 conexiones; personas: —; obras: Semillas de girasol (9), Tropicália (6); atraviesa: Representación (218).
- **Cuidado** — 3 conexiones; personas: —; obras: Las dos Fridas (13), Maman (13); atraviesa: Representación (218).
- **Deseo** — 3 conexiones; personas: —; obras: El nacimiento de Venus (13), Olympia (13); atraviesa: Representación (218).
- **Desnudo** — 3 conexiones; personas: —; obras: Olympia (13), David (12); atraviesa: Representación (218).
- **Diáspora** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), La jungla (8); atraviesa: Representación (218).
- **Domesticidad** — 3 conexiones; personas: —; obras: Las Meninas (15), La joven de la perla (10); atraviesa: Representación (218).
- **Ecología** — 3 conexiones; personas: —; obras: La gran ola de Kanagawa (15), Líneas de Nazca (5); atraviesa: Representación (218).
- **Educación** — 3 conexiones; personas: —; obras: Edificio Bauhaus de Dessau (12), La escuela de Atenas (12); atraviesa: Representación (218).
- **Esclavitud** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), El barco de esclavos (5); atraviesa: Representación (218).
- **Espectáculo** — 3 conexiones; personas: —; obras: Las Meninas (15), Díptico de Marilyn (11); atraviesa: Representación (218).
- **Exilio** — 3 conexiones; personas: —; obras: Guernica (18), La jungla (8); atraviesa: Representación (218).
- **Forma** — 3 conexiones; personas: —; obras: —; atraviesa: Representación (218), Minimalismo (17), Expresionismo abstracto (15).
- **Grabado** — 3 conexiones; personas: —; obras: La gran ola de Kanagawa (15), El 3 de mayo de 1808 (12); atraviesa: Materialidad (28).
- **Género** — 3 conexiones; personas: —; obras: Las dos Fridas (13), Olympia (13); atraviesa: Representación (218).
- **Iconografía** — 3 conexiones; personas: —; obras: El nacimiento de Venus (13), Busto de Nefertiti (12); atraviesa: —.
- **Inconsciente** — 3 conexiones; personas: —; obras: —; atraviesa: Representación (218), Surrealismo (22), Simbolismo (8).
- **Instalación** — 3 conexiones; personas: —; obras: Maman (13), Infinity Mirrored Room (7); atraviesa: Representación (218).
- **Melancolía** — 3 conexiones; personas: —; obras: La noche estrellada (11), El pensador (7); atraviesa: Representación (218).
- **Migración** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), Madre migrante (12); atraviesa: Representación (218).
- **Mirada** — 3 conexiones; personas: —; obras: Las Meninas (15), Olympia (13); atraviesa: Representación (218).
- **Monumento** — 3 conexiones; personas: —; obras: Maman (13), Panteón de Roma (7); atraviesa: Representación (218).
- **Muerte** — 3 conexiones; personas: —; obras: El 3 de mayo de 1808 (12), Saturno devorando a su hijo (8); atraviesa: Representación (218).
- **Mural** — 3 conexiones; personas: —; obras: Guernica (18), El hombre en la encrucijada (10); atraviesa: Representación (218).
- **Naturaleza muerta** — 3 conexiones; personas: —; obras: Mont Sainte-Victoire (9), Las señoritas de Aviñón (8); atraviesa: Representación (218).
- **Originalidad** — 3 conexiones; personas: —; obras: Fuente (10), One and Three Chairs (4); atraviesa: Representación (218).
- **Ornamento** — 3 conexiones; personas: —; obras: —; atraviesa: Representación (218), Art Nouveau (8), Arte islámico (7).
- **Perspectiva lineal** — 3 conexiones; personas: —; obras: Las Meninas (15), La escuela de Atenas (12); atraviesa: Representación (218).
- **Pintura de historia** — 3 conexiones; personas: —; obras: Guernica (18), El juramento de los Horacios (10); atraviesa: Materialidad (28).
- **Pintura religiosa** — 3 conexiones; personas: —; obras: La última cena (11), La vocación de san Mateo (9); atraviesa: Materialidad (28).
- **Propaganda** — 3 conexiones; personas: —; obras: Guernica (18), El hombre en la encrucijada (10); atraviesa: —.
- **Raza** — 3 conexiones; personas: —; obras: From Here I Saw What Happened (12), Madre migrante (12); atraviesa: Representación (218).
- **Revolución industrial** — 3 conexiones; personas: —; obras: Casa de la Cascada (13), Lluvia, vapor y velocidad (7); atraviesa: Representación (218).
- **Sexualidad** — 3 conexiones; personas: —; obras: Olympia (13), Venus de Urbino (9); atraviesa: Representación (218).
- **Sublime** — 3 conexiones; personas: —; obras: La noche estrellada (11), Lluvia, vapor y velocidad (7); atraviesa: Representación (218).
- **Tiempo** — 3 conexiones; personas: —; obras: Saturno devorando a su hijo (8), La persistencia de la memoria (7); atraviesa: Representación (218).
- **Trabajo industrial** — 3 conexiones; personas: —; obras: Edificio Bauhaus de Dessau (12), Lluvia, vapor y velocidad (7); atraviesa: Representación (218).
- **Vida** — 3 conexiones; personas: —; obras: El nacimiento de Venus (13), Las dos Fridas (13); atraviesa: Representación (218).
- **Artesanía** — 2 conexiones; personas: —; obras: —; atraviesa: Representación (218), Arts and Crafts (5).
- **Consumo** — 2 conexiones; personas: —; obras: —; atraviesa: Representación (218), Pop Art (12).
- **Manuscrito** — 2 conexiones; personas: —; obras: Tapiz de Bayeux (5); atraviesa: Representación (218).
- **Sueño** — 2 conexiones; personas: —; obras: —; atraviesa: Representación (218), Surrealismo (22).
- **Academia** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Accesibilidad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Activismo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Agua** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Agua y política** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Aire** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Alegoría** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Animal** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Archivo vivo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Arquitectura doméstica** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Canon** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Censura** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Cerámica** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Claroscuro** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Clima** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Conservación** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Cuerpo político** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Cultura popular** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Danza** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Derechos culturales** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Digital** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Discapacidad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Diseño gráfico** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Distopía** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Duelo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Escala** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Escuela** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Espacio** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Esperanza** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Exposición** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Feminismo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Folclore** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Fragmento** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Frontera** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Frontera colonial** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Fuego** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Globalización** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Huella** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Icono** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Industria** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Inteligencia artificial** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Interactividad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Joyería** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Lenguaje** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Luz** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Línea** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Medios de masas** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Mercado del arte** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Moda** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Monstruo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Museo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Museología** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Música** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Nación** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Paisaje rural** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Paisaje urbano** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Participación** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Patrimonio** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Patrimonio inmaterial** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Perspectiva aérea** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Planta** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Poesía** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Posmodernidad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Profano** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Propiedad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Proporción** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Publicidad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Pueblo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Queer** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Realidad virtual** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Red** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Repatriación** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Restauración** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Restitución** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Ritmo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Ruina** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sagrado** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Secularización** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sfumato** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Simetría** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sombra** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sonido** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sostenibilidad** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Sostenibilidad urbana** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Taller** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Teatro** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Tenebrism** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Territorio** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Testimonio** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Textil** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Textura** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Tierra** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Tipografía** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Trabajador** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Traducción** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Trauma** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Turismo cultural** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Técnicas de reproducción** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Utopía** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Vanguardia** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).
- **Vídeo** — 1 conexiones; personas: —; obras: —; atraviesa: Representación (218).

## 8. Techniques & Materials

- **Acero** — 5 conexiones; principales: Materialidad (28), Casa de la Cascada (13), Maman (13), Edificio Bauhaus de Dessau (12).
- **Acuarela** — 3 conexiones; principales: Materialidad (28), La gran ola de Kanagawa (15), Lluvia repentina sobre el puente Ohashi (10).
- **Aguafuerte** — 3 conexiones; principales: Materialidad (28), El 3 de mayo de 1808 (12), Estela de Naram-Sin (6).
- **Bronce** — 3 conexiones; principales: Materialidad (28), Doríforo (9), Bronces de Benín (7).
- **Collage** — 3 conexiones; principales: Materialidad (28), Fuente (10), Las señoritas de Aviñón (8).
- **Dibujo** — 3 conexiones; principales: Materialidad (28), La Gioconda (12), Composición VIII (4).
- **Ensamblaje** — 3 conexiones; principales: Materialidad (28), Maman (13), Semillas de girasol (9).
- **Fresco** — 3 conexiones; principales: Materialidad (28), La última cena (11), El hombre en la encrucijada (10).
- **Fundición** — 3 conexiones; principales: Materialidad (28), Maman (13), David (12).
- **Hormigón** — 5 conexiones; principales: Materialidad (28), Casa de la Cascada (13), Edificio Bauhaus de Dessau (12), Gran Mezquita de Djenné (10).
- **Lienzo** — 26 conexiones; principales: Guernica (18), Las Meninas (15), El nacimiento de Venus (13), Las dos Fridas (13), Olympia (13).
- **Litografía** — 3 conexiones; principales: Materialidad (28), La gran ola de Kanagawa (15), Dama con lámpara (8).
- **Madera** — 3 conexiones; principales: Materialidad (28), Gran Mezquita de Djenné (10), Templo de Kukulkán (5).
- **Mármol** — 16 conexiones; principales: Materialidad (28), Maman (13), David (12), Gran Mezquita de Djenné (10), Doríforo (9).
- **Oro** — 3 conexiones; principales: Representación (218), Busto de Nefertiti (12), Retrato de Adele Bloch-Bauer I (6).
- **Papel** — 6 conexiones; principales: Materialidad (28), La gran ola de Kanagawa (15), Lluvia repentina sobre el puente Ohashi (10), Dama con lámpara (8), Bronces de Benín (7).
- **Película fotográfica** — 12 conexiones; principales: Materialidad (28), Madre migrante (12), Faces and Phases (10), Seascapes (10), Dama en la calle (8).
- **Perspectiva** — 4 conexiones; principales: Representación (218), Renacimiento italiano (28), La escuela de Atenas (12), La última cena (11).
- **Pigmento** — 3 conexiones; principales: Materialidad (28), Busto de Nefertiti (12), Pinturas de Lascaux (6).
- **Pintura al óleo** — 26 conexiones; principales: Guernica (18), Las Meninas (15), El nacimiento de Venus (13), Las dos Fridas (13), Olympia (13).
- **Serigrafía** — 3 conexiones; principales: Materialidad (28), Díptico de Marilyn (11), Semillas de girasol (9).
- **Talla** — 10 conexiones; principales: Materialidad (28), Maman (13), David (12), Doríforo (9), Psique reanimada por el beso (8).
- **Témpera** — 2 conexiones; principales: Materialidad (28), Busto de Nefertiti (12).
- **Vidrio** — 3 conexiones; principales: Materialidad (28), Gran Mezquita de Djenné (10), Catedral de Chartres (7).
- **Xilografía** — 6 conexiones; principales: Materialidad (28), La gran ola de Kanagawa (15), Lluvia repentina sobre el puente Ohashi (10), Bronces de Benín (7).

Posibles gaps para revisión (no encontrados como canonical, alias, traducción o slug): daguerrotipo, mosaico, bordado y videoarte. No es una instrucción de añadirlos.

## 9. Genres & Formats

- **Retrato** — 17 conexiones; Las Meninas (15), Las dos Fridas (13), Olympia (13), Busto de Nefertiti (12), David (12), La Gioconda (12).
- **Autorretrato** — 3 conexiones; Representación (218), Las dos Fridas (13), Autorretrato con collar de espinas (6).
- **Naturaleza muerta** — 3 conexiones; Representación (218), Mont Sainte-Victoire (9), Las señoritas de Aviñón (8).
- **Pintura de historia** — 3 conexiones; Materialidad (28), Guernica (18), El juramento de los Horacios (10).
- **Desnudo** — 3 conexiones; Representación (218), Olympia (13), David (12).
- **Pintura religiosa** — 3 conexiones; Materialidad (28), La última cena (11), La vocación de san Mateo (9).
- **Mural** — 3 conexiones; Representación (218), Guernica (18), El hombre en la encrucijada (10).
- **Monumento** — 3 conexiones; Representación (218), Maman (13), Panteón de Roma (7).
- **Manuscrito** — 2 conexiones; Representación (218), Tapiz de Bayeux (5).
- **Arquitectura** — 14 conexiones; Casa de la Cascada (13), Edificio Bauhaus de Dessau (12), Gran Mezquita de Djenné (10), Santa Sofía (8), Catedral de Chartres (7), Panteón de Roma (7).
- **Fotografía** — 28 conexiones; From Here I Saw What Happened (12), Madre migrante (12), Faces and Phases (10), Seascapes (10), Dama en la calle (8), Equivalentes (8).
- **Cine** — 3 conexiones; Representación (218), From Here I Saw What Happened (12), La persistencia de la memoria (7).
- **Instalación** — 3 conexiones; Representación (218), Maman (13), Infinity Mirrored Room (7).
- **Grabado** — 3 conexiones; Materialidad (28), La gran ola de Kanagawa (15), El 3 de mayo de 1808 (12).
- **Performance** — 5 conexiones; Barroco (27), Marina Abramović (5), Fluxus (4), Arte de performance (3), Rhythm 0 (3).

## 10. Places

- **Alejandría** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte griego (14).
- **Amberes** — PLACE; 3 conexiones; personas Peter Paul Rubens (4); obras La elevación de la cruz (5); movimientos/eventos —.
- **Atenas** — PLACE; 6 conexiones; personas Homero (4), Sófocles (4); obras Teatro de Epidauro (6), La corriente del Golfo (5); movimientos/eventos —.
- **Barcelona** — PLACE; 3 conexiones; personas Joan Miró (4); obras El carnaval del arlequín (5); movimientos/eventos —.
- **Belgrado** — PLACE; 3 conexiones; personas Marina Abramović (5); obras Rhythm 0 (3); movimientos/eventos —.
- **Benin City** — PLACE; 5 conexiones; personas Artistas del Reino de Benín (4), Romuald Hazoumè (4); obras Bronces de Benín (7), La bouche du temps (4); movimientos/eventos —.
- **Berlín** — PLACE; 14 conexiones; personas Caspar David Friedrich (4), Ernst Ludwig Kirchner (4), Hannah Höch (4); obras Edificio Bauhaus de Dessau (12), Freischwimmer (8), El caminante sobre el mar de nubes (6); movimientos/eventos —.
- **Bogotá** — PLACE; 5 conexiones; personas Beatriz González (4), Óscar Murillo (4); obras The Cleaner (6), Apuntes para la historia del arte (4); movimientos/eventos —.
- **Bombay** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte indio (11).
- **Bruselas** — PLACE; 3 conexiones; personas René Magritte (4); obras El hijo del hombre (4); movimientos/eventos —.
- **Bucarest** — PLACE; 3 conexiones; personas Geta Brătescu (4); obras Double Plot (4); movimientos/eventos —.
- **Buenos Aires** — PLACE; 5 conexiones; personas Tarsila do Amaral (5), Guillermo Kuitca (4); obras Abaporu (5), El mar (4); movimientos/eventos —.
- **Ciudad de México** — PLACE; 13 conexiones; personas Frida Kahlo (5), David Alfaro Siqueiros (4), Diego Rivera (4); obras Las dos Fridas (13), El hombre en la encrucijada (10), Autorretrato con collar de espinas (6); movimientos/eventos —.
- **Constantinopla** — PLACE; 4 conexiones; personas Dionisio (4); obras Cristo Pantocrátor (4); movimientos/eventos Arte bizantino (6).
- **Cuzco** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte andino (4).
- **Córdoba** — PLACE; 3 conexiones; personas —; obras Mezquita Azul (3); movimientos/eventos Arte islámico (7).
- **Delhi** — PLACE; 8 conexiones; personas Amar Kanwar (4), Raja Ravi Varma (4), Shahzia Sikander (4); obras Dama con lámpara (8), Narrativa no lineal (5), Fleshly Sight (4); movimientos/eventos —.
- **Dessau** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos —.
- **Djenné** — PLACE; 3 conexiones; personas Artistas de Djenné (4); obras Gran Mezquita de Djenné (10); movimientos/eventos —.
- **El Cairo** — PLACE; 5 conexiones; personas Ibrahim el-Salahi (4); obras The Last Sound (4); movimientos/eventos Arte egipcio (4).
- **Florencia** — PLACE; 23 conexiones; personas Giambologna (5), Leonardo da Vinci (5), Donatello (4); obras El nacimiento de Venus (13), David (12), La Gioconda (12); movimientos/eventos —.
- **Hanói** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte chino (5).
- **Jartum** — PLACE; 1 conexiones; personas —; obras —; movimientos/eventos —.
- **Johannesburgo** — PLACE; 5 conexiones; personas William Kentridge (4), Zanele Muholi (4); obras Faces and Phases (10), Felix en el exilio (5); movimientos/eventos —.
- **Kioto** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Ukiyo-e (8).
- **La Habana** — PLACE; 3 conexiones; personas Wifredo Lam (4); obras La jungla (8); movimientos/eventos —.
- **Lagos** — PLACE; 5 conexiones; personas El Anatsui (4), Sokari Douglas Camp (4); obras Tierra desarrollando más raíces (5), Cage (4); movimientos/eventos —.
- **Londres** — PLACE; 17 conexiones; personas J. M. W. Turner (5), Bridget Riley (4), John Constable (4); obras Lluvia, vapor y velocidad (7), Hot Spot (6), El anciano de los días (5); movimientos/eventos —.
- **Los Ángeles** — PLACE; 1 conexiones; personas —; obras —; movimientos/eventos —.
- **Madrid** — PLACE; 11 conexiones; personas Francisco de Goya (5), Bartolomé Esteban Murillo (4), Diego Velázquez (4); obras Las Meninas (15), El 3 de mayo de 1808 (12), Saturno devorando a su hijo (8); movimientos/eventos —.
- **Mantua** — PLACE; 3 conexiones; personas Andrea Mantegna (4); obras Cámara de los esposos (4); movimientos/eventos —.
- **Milán** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Art Nouveau (8).
- **Moscú** — PLACE; 10 conexiones; personas El Lissitzky (4), Elena Guro (4), Kazimir Malévich (4); obras El pequeño camello (5), Vence a los blancos con la cuña roja (5), Cuadrado negro (4); movimientos/eventos —.
- **Múnich** — PLACE; 3 conexiones; personas Wassily Kandinsky (4); obras Composición VIII (4); movimientos/eventos —.
- **Nueva York** — PLACE; 71 conexiones; personas Agnes Martin (4), Alfred Stieglitz (4), Alice Neel (4); obras Casa de la Cascada (13), Maman (13), From Here I Saw What Happened (12); movimientos/eventos —.
- **Nápoles** — PLACE; 3 conexiones; personas José de Ribera (4); obras El patizambo (5); movimientos/eventos —.
- **Núremberg** — PLACE; 3 conexiones; personas Albrecht Dürer (4); obras Melancolía I (5); movimientos/eventos —.
- **París** — PLACE; 98 conexiones; personas Pablo Picasso (7), Georges Braque (5), Jacques-Louis David (5); obras Guernica (18), Olympia (13), La noche estrellada (11); movimientos/eventos —.
- **Pekín** — PLACE; 5 conexiones; personas Ai Weiwei (6), Wang Shu (4); obras Semillas de girasol (9), Museo de Ningbo (5); movimientos/eventos —.
- **Praga** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Art Nouveau (8).
- **Roma** — PLACE; 21 conexiones; personas Vitruvio (5), Angelica Kauffmann (4), Annibale Carracci (4); obras La escuela de Atenas (12), La vocación de san Mateo (9), Psique reanimada por el beso (8); movimientos/eventos —.
- **Seúl** — PLACE; 1 conexiones; personas —; obras —; movimientos/eventos —.
- **São Paulo** — PLACE; 9 conexiones; personas Tarsila do Amaral (5), Cildo Meireles (4), Lygia Clark (4); obras Divisor (6), Inserción en circuitos ideológicos (6), Antropofagia (4); movimientos/eventos —.
- **Teherán** — PLACE; 3 conexiones; personas Monir Shahroudy Farmanfarmaian (4); obras Mirror Ball (6); movimientos/eventos —.
- **Tenochtitlan** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte mexica (5).
- **Teotihuacan** — PLACE; 2 conexiones; personas —; obras —; movimientos/eventos Arte mexica (5).
- **Tokio** — PLACE; 18 conexiones; personas Do Ho Suh (4), Hiroshi Sugimoto (4), Katsushika Hokusai (4); obras La gran ola de Kanagawa (15), Lluvia repentina sobre el puente Ohashi (10), Seascapes (10); movimientos/eventos —.
- **Toledo** — PLACE; 3 conexiones; personas Doménikos Theotokópoulos (5); obras El entierro del conde de Orgaz (8); movimientos/eventos —.
- **Toledo** — PLACE; 2 conexiones; personas Doménikos Theotokópoulos (5); obras —; movimientos/eventos —.
- **Venecia** — PLACE; 6 conexiones; personas Canaletto (4), Giorgione (4), Tiziano Vecellio (4); obras Venus de Urbino (9), El Gran Canal (4), La tempestad (4); movimientos/eventos —.
- **Viena** — PLACE; 7 conexiones; personas Gustav Klimt (5), Egon Schiele (4), Hilma af Klint (3); obras Retrato de Adele Bloch-Bauer I (6), Autorretrato con farol chino (5), El beso (4); movimientos/eventos —.
- **Weimar** — PLACE; 8 conexiones; personas Josef Albers (4), Lyonel Feininger (4), Oskar Schlemmer (4); obras Máquina de trinar (5), Ballet triádico (4), Homenaje al cuadrado (4); movimientos/eventos —.
- **Zúrich** — PLACE; 5 conexiones; personas Sophie Taeuber-Arp (4), Tristan Tzara (4); obras Danza vertical (4), Lunar Caustic (4); movimientos/eventos Dadaísmo (20).
- **Ámsterdam** — PLACE; 12 conexiones; personas Frans Hals (4), Jan van Eyck (4), Johannes Vermeer (4); obras La joven de la perla (10), La ronda de noche (8), Magdalena (6); movimientos/eventos —.

Centros mejor representados: París (98), Nueva York (71), Florencia (23), Roma (21), Tokio (18), Londres (17), Berlín (14), Ciudad de México (13), Ámsterdam (12), Madrid (11), Moscú (10), São Paulo (9), Delhi (8), Weimar (8), Viena (7).

## 11. Organizations

- **Académie des Beaux-Arts** — school/academy/other; 2 conexiones; WORK: 1 (El juramento de los Horacios (10)).
- **Black Mountain College** — school/academy/other; 2 conexiones; WORK: 0 (—).
- **Escuela Bauhaus** — school/academy/other; 2 conexiones; WORK: 1 (Edificio Bauhaus de Dessau (12)).
- **Escuela de Atenas** — school/academy/other; 2 conexiones; WORK: 1 (La escuela de Atenas (12)).
- **Galería Uffizi** — museum/collection; 2 conexiones; WORK: 1 (El nacimiento de Venus (13)).
- **Instituto Warburg** — school/academy/other; 2 conexiones; WORK: 0 (—).
- **Instituto de Arte de Chicago** — school/academy/other; 2 conexiones; WORK: 1 (La noche estrellada (11)).
- **Metropolitan Museum of Art** — museum/collection; 2 conexiones; WORK: 1 (Fuente (10)).
- **Museo Británico** — museum/collection; 2 conexiones; WORK: 1 (Busto de Nefertiti (12)).
- **Museo Egipcio de El Cairo** — museum/collection; 2 conexiones; WORK: 1 (Busto de Nefertiti (12)).
- **Museo Nacional de Antropología** — museum/collection; 2 conexiones; WORK: 1 (Piedra del Sol (4)).
- **Museo Nacional de Arte** — museum/collection; 2 conexiones; WORK: 1 (Abaporu (5)).
- **Museo Reina Sofía** — museum/collection; 2 conexiones; WORK: 1 (Guernica (18)).
- **Museo de Arte Moderno** — museum/collection; 2 conexiones; WORK: 1 (Fuente (10)).
- **Museo del Louvre** — museum/collection; 2 conexiones; WORK: 1 (La Gioconda (12)).
- **Museo del Prado** — museum/collection; 3 conexiones; WORK: 2 (Las Meninas (15), El 3 de mayo de 1808 (12)).
- **National Gallery** — museum/collection; 2 conexiones; WORK: 1 (La joven de la perla (10)).
- **Tate Modern** — museum/collection; 2 conexiones; WORK: 1 (Díptico de Marilyn (11)).

## 12. Events

- **Revolución francesa** — 1789–1799; 4 conexiones; artistas —; obras —; abstracciones Siglo XIX (92), Neoclasicismo (13), Poder (6), Revolución (4).
- **Armory Show** — 1913–—; 3 conexiones; artistas —; obras —; abstracciones Siglo XX (213), Cubismo (13), Modernidad (4).
- **Primera Guerra Mundial** — 1914–1918; 2 conexiones; artistas —; obras —; abstracciones Siglo XX (213), Dadaísmo (20).
- **Revolución rusa** — 1917–—; 2 conexiones; artistas —; obras —; abstracciones Siglo XX (213), Constructivismo (10).
- **Guerra civil española** — 1936–1939; 2 conexiones; artistas —; obras Guernica (18); abstracciones Siglo XX (213).
- **Segunda Guerra Mundial** — 1939–1945; 3 conexiones; artistas —; obras —; abstracciones Siglo XX (213), Guerra (11), Propaganda (3).

## 13. Relation Types

- **`BELONGS_TO_PERIOD`** — 448; source→target habitual: WORK→ABSTRACTION (209), PERSON→ABSTRACTION (182), ABSTRACTION→ABSTRACTION (51); ejemplos: Fotografía moderna → Siglo XX; Arte rupestre → Neolítico; Semillas de girasol → Siglo XXI; Arte rupestre → Paleolítico.
- **`ABOUT_CONCEPT`** — 445; source→target habitual: WORK→ABSTRACTION (378), ABSTRACTION→ABSTRACTION (59), EVENT→ABSTRACTION (5); ejemplos: Autorretrato → Representación; Red House → Representación; Composición con rojo, azul y amarillo → Representación; Visión después del sermón → Representación.
- **`BELONGS_TO_MOVEMENT`** — 415; source→target habitual: WORK→ABSTRACTION (223), PERSON→ABSTRACTION (192); ejemplos: Giotto di Bondone → Gótico; Jan van Eyck → Renacimiento nórdico; Albrecht Dürer → Renacimiento nórdico; Pieter Bruegel el Viejo → Renacimiento nórdico.
- **`ASSOCIATED_WITH`** — 245; source→target habitual: WORK→PLACE (202), PLACE→ABSTRACTION (37), EVENT→ABSTRACTION (2); ejemplos: Armory Show → Cubismo; Revolución francesa → Neoclasicismo; Escultura blanda → Nueva York; Georges Braque → Pablo Picasso.
- **`LOCATED_IN`** — 243; source→target habitual: PERSON→PLACE (193), ORGANIZATION→PLACE (18), WORK→ORGANIZATION (17); ejemplos: Giotto di Bondone → Florencia; Jan van Eyck → Ámsterdam; Albrecht Dürer → Núremberg; Pieter Bruegel el Viejo → Ámsterdam.
- **`CREATED_BY`** — 216; source→target habitual: WORK→PERSON (214), WORK→ABSTRACTION (2); ejemplos: Laocoonte y sus hijos → Agesandro de Rodas; Panteón de Roma → Apollodoro de Damasco; Santa Sofía → Antemio de Tralles; Santa Sofía → Isidoro de Mileto.
- **`PART_OF`** — 189; source→target habitual: ABSTRACTION→ABSTRACTION (189); ejemplos: Icono → Representación; Alegoría → Representación; Canon → Representación; Perspectiva aérea → Representación.
- **`USES_MATERIAL`** — 55; source→target habitual: WORK→ABSTRACTION (55); ejemplos: La Gioconda → Lienzo; El nacimiento de Venus → Lienzo; Las Meninas → Lienzo; Olympia → Lienzo.
- **`USES_TECHNIQUE`** — 45; source→target habitual: WORK→ABSTRACTION (45); ejemplos: La Gioconda → Pintura al óleo; El nacimiento de Venus → Pintura al óleo; Las Meninas → Pintura al óleo; Olympia → Pintura al óleo.
- **`INFLUENCED_BY`** — 25; source→target habitual: ABSTRACTION→ABSTRACTION (24), PERSON→PERSON (1); ejemplos: Pablo Picasso → Paul Cézanne; Renacimiento italiano → Arte romano; Neoclasicismo → Arte griego; Neoclasicismo → Arte romano.
- **`HAS_SUBJECT`** — 14; source→target habitual: WORK→ABSTRACTION (14); ejemplos: Olympia → Retrato; Las dos Fridas → Retrato; Las Meninas → Retrato; La joven de la perla → Retrato.

No se usa RELATED_TO ni otras relaciones genéricas en la seed final; predominan predicados taxonómicos/semánticos explícitos.

## 14. Graph Health

Average degree: 6.09  
Median degree: 4  
Orphans: 0  
Low-connectivity: 1=116, 2=37, 3=96  
Components: 1  
Largest component: 768/768 (100.0%).

### Low-connectivity

- Degree 0 (0): —.
- Degree 1 (116): Academia (1), Accesibilidad (1), Activismo (1), Agesandro de Rodas (1), Agua (1), Agua y política (1), Aire (1), Alegoría (1), Animal (1), Antemio de Tralles (1), Apollodoro de Damasco (1), Archivo vivo (1), Arquitectura doméstica (1), Calícrates (1), Canon (1), Censura (1), Cerámica (1), Claroscuro (1), Clima (1), Conservación (1), Cuerpo político (1), Cultura popular (1), Danza (1), Derechos culturales (1), Digital (1), Discapacidad (1), Diseño gráfico (1), Distopía (1), Duelo (1), Escala (1), Escuela (1), Espacio (1), Esperanza (1), Exposición (1), Feminismo (1), Folclore (1), Fragmento (1), Frontera (1), Frontera colonial (1), Fuego (1), Globalización (1), Huella (1), Hélio Oiticica (1), Icono (1), Ictino (1), Industria (1), Inteligencia artificial (1), Interactividad (1), Isidoro de Mileto (1), Jartum (1), Joseph Kosuth (1), Joyería (1), Lenguaje (1), Los Ángeles (1), Luz (1), Línea (1), Medios de masas (1), Mercado del arte (1), Moda (1), Modernismo brasileño (1), Monstruo (1), Museo (1), Museología (1), Música (1), Nación (1), Neolítico (1), Paisaje rural (1), Paisaje urbano (1), Participación (1), Patrimonio (1), Patrimonio inmaterial (1), Perspectiva aérea (1), Planta (1), Poesía (1), Policleto (1), Posmodernidad (1), Profano (1), Propiedad (1), Proporción (1), Publicidad (1), Pueblo (1), Queer (1), Realidad virtual (1), Red (1), Repatriación (1), Restauración (1), Restitución (1), Ritmo (1), Ruina (1), Sagrado (1), Secularización (1), Seúl (1), Sfumato (1), Siglo XXI (1), Simetría (1), Sombra (1), Sonido (1), Sostenibilidad (1), Sostenibilidad urbana (1), Taller (1), Teatro (1), Tenebrism (1), Territorio (1), Testimonio (1), Textil (1), Textura (1), Tierra (1), Tipografía (1), Trabajador (1), Traducción (1), Trauma (1), Turismo cultural (1), Técnicas de reproducción (1), Utopía (1), Vanguardia (1), Vídeo (1).
- Degree 2 (37): Académie des Beaux-Arts (2), Agustín de Hipona (2), Alejandría (2), Artesanía (2), Black Mountain College (2), Bombay (2), Consumo (2), Cuzco (2), Dessau (2), Escuela Bauhaus (2), Escuela de Atenas (2), Galería Uffizi (2), Guerra civil española (2), Hanói (2), Instituto Warburg (2), Instituto de Arte de Chicago (2), Kioto (2), Manuscrito (2), Metropolitan Museum of Art (2), Milán (2), Museo Británico (2), Museo Egipcio de El Cairo (2), Museo Nacional de Antropología (2), Museo Nacional de Arte (2), Museo Reina Sofía (2), Museo de Arte Moderno (2), Museo del Louvre (2), National Gallery (2), Praga (2), Primera Guerra Mundial (2), Revolución rusa (2), Sueño (2), Tate Modern (2), Tenochtitlan (2), Teotihuacan (2), Toledo (2), Témpera (2).
- Degree 3 (96): Acuarela (3), Aguafuerte (3), Amberes (3), Archivo (3), Armory Show (3), Arte de performance (3), Arte maya (3), Autorretrato (3), Barcelona (3), Belgrado (3), Bronce (3), Bruselas (3), Bucarest (3), Carrie Mae Weems (3), Cine (3), Clase social (3), Collage (3), Colonialismo (3), Color (3), Comunidad (3), Constantin Brâncuși (3), Cuidado (3), Código de Hammurabi (3), Córdoba (3), Deseo (3), Desnudo (3), Dibujo (3), Discóbolo (3), Diáspora (3), Djenné (3), Domesticidad (3), Dorothea Lange (3), Ecología (3), Educación (3), Ensamblaje (3), Esclavitud (3), Espectáculo (3), Exilio (3), Forma (3), Fresco (3), Fundición (3), Georgia O'Keeffe (3), Grabado (3), Género (3), Henri Cartier-Bresson (3), Hilma af Klint (3), Iconografía (3), Inconsciente (3), Instalación (3), La Habana (3), Litografía (3), Madera (3), Mantua (3), Melancolía (3), Mezquita Azul (3), Migración (3), Mirada (3), Monumento (3), Muerte (3), Mural (3), Museo del Prado (3), Múnich (3), Naturaleza muerta (3), Nápoles (3), Núremberg (3), Originalidad (3), Ornamento (3), Oro (3), Oswald de Andrade (3), Palacio de Versalles (3), Paleolítico (3), Perspectiva lineal (3), Pigmento (3), Pintura de historia (3), Pintura religiosa (3), Plinio el Viejo (3), Propaganda (3), Raza (3), Revolución industrial (3), Rhythm 0 (3), Robert Delaunay (3), Románico (3), Segunda Guerra Mundial (3), Serigrafía (3), Sexualidad (3), Sonia Delaunay (3), Sublime (3), Teherán (3), The Body as Archive (3), Tiempo (3), Toledo (3), Torre Eiffel (3), Trabajo industrial (3), Venus de Willendorf (3), Vida (3), Vidrio (3).

### Components

- 768 nodos: Edad Media, Catedral de Chartres, Espacio público, Gran Mezquita de Djenné, Djenné, Ciudad, Dessau, Escuela Bauhaus, Bogotá, The Cleaner, Autoría, Divisor, São Paulo, Oswald de Andrade, Modernidad, Impresionismo, Postimpresionismo, Henri de Toulouse-Lautrec, París, Rehenes, Informalismo, Materialidad, Grabado, La gran ola de Kanagawa, Tokio, Paper Church, Arquitectura moderna, Museo de Ningbo, Tecnología, Constructivismo, El Lissitzky, Moscú, Cuadrado negro, El pequeño camello, Futurismo, Máquina, El ciclista, Kazimir Malévich, Natalia Goncharova, Elena Guro, Minimalismo, Sin título, Nueva York, Embarcadero espiral, Land Art, Andy Warhol, Pop Art, Consumo, Jasper Johns, Díptico de Marilyn, Lienzo, Saturno devorando a su hijo, Muerte, Madrid, Inmaculada de Soult, Edad Moderna, El caballero sonriente, Ámsterdam, Cazadores en la nieve, Renacimiento, Miguel Ángel, Florencia, Galería Uffizi, Rafael, Roma, Autorretrato, Neoclasicismo, Arte romano, Imperio, Arte mexica, Piedra del Sol, Museo Nacional de Antropología, Ciudad de México, El hombre en la encrucijada, Violencia, Estela de Naram-Sin, Arte mesopotámico, Código de Hammurabi, Aristóteles, Discóbolo, Poder, Palacio de Versalles, Lujo, Retrato de Adele Bloch-Bauer I, Viena, El beso, Autorretrato con farol chino, Expresionismo, Wassily Kandinsky, Composición VIII, Abstracción, De Stijl, Calle de Berlín, Berlín, Corte con el cuchillo de cocina, Freischwimmer, Memoria, Faces and Phases, Zanele Muholi, Modulador espacio-luz, El caminante sobre el mar de nubes, Walter Gropius, Henrike Naumann, Wolfgang Tillmans, László Moholy-Nagy, Caspar David Friedrich, Hannah Höch, Ernst Ludwig Kirchner, Los diez mayores, Hilma af Klint, Egon Schiele, Oro, Busto de Nefertiti, Arte egipcio, Museo Egipcio de El Cairo, Museo Británico, Londres, Red House, Arts and Crafts, Artesanía, La carreta de heno, El anciano de los días, Lluvia, vapor y velocidad, Trabajo industrial, Revolución industrial, Sublime, Instituto Warburg, National Gallery, William Morris, Mona Hatoum, John Constable, J. M. W. Turner, William Blake, Iconografía, Art Nouveau, Ornamento, Gustav Klimt, El barco de esclavos, Esclavitud, Colonialismo, Guerra, Segunda Guerra Mundial, Muralismo mexicano, Abaporu, Mural, Trabajo, Propaganda, Autorretrato, Eco de un grito, Creación de las aves, Surrealismo, Sueño, Expresionismo abstracto, Inconsciente, Simbolismo, Joan Miró, El carnaval del arlequín, La jungla, Mito, Tropicália, Comunidad, Hélio Oiticica, Pinturas de Lascaux, Paleolítico, Venus de Willendorf, Ritual, Arte andino, Líneas de Nazca, Arte maya, Arte chino, Ai Weiwei, Arte rupestre, Neolítico, Laocoonte y sus hijos, Agesandro de Rodas, Exilio, Diáspora, El hijo del hombre, Wifredo Lam, René Magritte, Autorretrato con collar de espinas, Identidad, Autorretrato, Museo Nacional de Arte, Diego Rivera, Frida Kahlo, Manuela Ballester, David Alfaro Siqueiros, Remedios Varo, Arte griego, Belleza, Doríforo, Policleto, Sófocles, Homero, La corriente del Golfo, Revolución francesa, Revolución, Sin título, Psique reanimada por el beso, Augusto de Prima Porta, Plinio el Viejo, Agustín de Hipona, Cy Twombly, Antonio Canova, Angelica Kauffmann, Vitruvio, Tiziano Vecellio, Venecia, Sandro Botticelli, Leonardo da Vinci, La Anunciación, Melancolía I, La tempestad, Cámara de los esposos, La flagelación de Cristo, San Jorge, La expulsión del paraíso, Giorgione, Andrea Mantegna, Piero della Francesca, Fra Angelico, Donatello, Masaccio, Albrecht Dürer, Renacimiento italiano, Perspectiva, Renacimiento nórdico, Retrato de Giovanni Arnolfini, Marlene Dumas, Pieter Bruegel el Viejo, Jan van Eyck, Giambologna, Johannes Vermeer, Rembrandt van Rijn, Michelangelo Merisi da Caravaggio, Doménikos Theotokópoulos, El patizambo, Judith y su doncella, La elevación de la cruz, El banquete de Cleopatra, Hipómenes y Atalanta, Asunción de la Virgen, Rapto de las sabinas, La Virgen del cuello largo, Frans Hals, Guido Reni, Annibale Carracci, Pontormo, El Gran Canal, Canaletto, José de Ribera, Artemisia Gentileschi, Peter Paul Rubens, Rococo, Manierismo, Barroco, Performance, Fluxus, Rhythm 0, Marina Abramović, Arte de performance, La apoteosis de la guerra, Museo Reina Sofía, Museo del Prado, Diego Velázquez, Vasily Vereshchagin, Bartolomé Esteban Murillo, Romanticismo, Francisco de Goya, Tiempo, La joven de la perla, Domesticidad, La ronda de noche, La vocación de san Mateo, El entierro del conde de Orgaz, Venus de Urbino, Sexualidad, La escuela de Atenas, Educación, Escuela de Atenas, Perspectiva lineal, David, Desnudo, La última cena, Las dos Fridas, Vida, Género, Cuidado, Las Meninas, Mirada, Clase social, El nacimiento de Venus, Deseo, La Gioconda, Pintura al óleo, Cuerpo, Dama con lámpara, Delhi, Narrativa no lineal, Very Hungry God, Fleshly Sight, Amar Kanwar, Subodh Gupta, Shahzia Sikander, Arte indio, Raja Ravi Varma, Retrato, Tate Modern, Espectáculo, Número 14, Número 1A, 1948, Madre migrante, Raza, Migración, Dorchester Projects, Dibujo mural 118, Jimson Weed, Blue Print, Montañas y mar, Composición, Fumarolas, Cartel de la guerra, Retrato de Manuela, Equivalentes, From Here I Saw What Happened, Cine, Archivo, Untitled Film Still #21, Shibboleth, The Body as Archive, Instituto de Arte de Chicago, Black Mountain College, Museo de Arte Moderno, Metropolitan Museum of Art, Louise Bourgeois, Mark Rothko, Jackson Pollock, Dorothea Lange, Georgia O'Keeffe, Marcel Duchamp, Robert Smithson, Claes Oldenburg, Walid Beshty, Martha Rosler, Hans Haacke, Judy Chicago, Robert Rauschenberg, Helen Frankenthaler, Lee Krasner, Philip Guston, Ben Shahn, Alice Neel, Alfred Stieglitz, Theaster Gates, Shirin Neshat, Carrie Mae Weems, Cindy Sherman, Sol LeWitt, Contingente, Monumento para V. Tatlin, Forma, Amistad, Sin título, Arco inclinado, Catarata, Dan Flavin, Robert Morris, Richard Serra, Bridget Riley, Agnes Martin, Donald Judd, Eva Hesse, Suprematismo, Revolución rusa, Vence a los blancos con la cuña roja, Cuadro negro, Liubov Popova, Fotografía, Fotografía moderna, Bauhaus, Josef Albers, Weimar, Máquina de trinar, Ballet triádico, Homenaje al cuadrado, La ciudad al final del mundo, Oskar Schlemmer, Lyonel Feininger, Paul Klee, Frank Lloyd Wright, Wang Shu, Lluvia repentina sobre el puente Ohashi, Cut Piece, The Trees, Seascapes, Seoul Home, Utagawa Hiroshige, Yayoi Kusama, Yoko Ono, Shigeru Ban, Ryue Nishizawa, Hiroshi Sugimoto, Takashi Murakami, Do Ho Suh, Naturaleza, Paisaje, Ecología, Ukiyo-e, Katsushika Hokusai, Tradición, El 3 de mayo de 1808, Témpera, Fresco, Película fotográfica, Acero, Pigmento, Papel, Bronces de Benín, Artistas del Reino de Benín, Bronce, Talla, Fundición, Ensamblaje, Collage, Serigrafía, Litografía, Aguafuerte, Xilografía, Dibujo, Acuarela, Pintura religiosa, Pintura de historia, Semillas de girasol, Siglo XXI, Maman, Monumento, Instalación, Composición con rojo, azul y amarillo, Académie des Beaux-Arts, Las señoritas de Aviñón, Naturaleza muerta, El pensador, Melancolía, Detrás de la estación Saint-Lazare, La persistencia de la memoria, Sonia Delaunay, Orfismo, La feria de caballos, Olympia, Un entierro en Ornans, La Libertad guiando al pueblo, El juramento de los Horacios, Júpiter y Sémele, Madame de Pompadour, Pájaro en el espacio, Dos niños amenazados por un ruiseñor, Prismas eléctricos, Villa Savoye, Violín y candela, La danza, Suite Vénitienne, Fisicromía, Torre Eiffel, Dama en la calle, Rayografía, Estudio para el juramento de los Horacios, El ojo como globo extraño, Las espigadoras, El vagón de tercera clase, La balsa de la Medusa, El columpio, Fiesta de amor, La Magdalena penitente, Móvil rojo, Objeto para ser destruido, Teléfono langosta, Museo del Louvre, Henri Cartier-Bresson, Le Corbusier, Salvador Dalí, Georges Braque, Pablo Picasso, Henri Matisse, Auguste Rodin, Édouard Manet, Gustave Courbet, Eugène Delacroix, Jacques-Louis David, Jean Fautrier, Piet Mondrian, Sophie Calle, Carlos Cruz-Diez, Robert Delaunay, Francis Picabia, Man Ray, Gustave Moreau, Jean-François Millet, Honoré Daumier, Théodore Géricault, Jean-Honoré Fragonard, François Boucher, Antoine Watteau, Georges de La Tour, Constantin Brâncuși, Alexander Calder, Meret Oppenheim, Max Ernst, Odilon Redon, Rosa Bonheur, Color, Fauvismo, Mont Sainte-Victoire, Los girasoles, La noche estrellada, Paul Cézanne, Paul Gauguin, Vincent van Gogh, Visión después del sermón, Bretonas en el prado, Moulin Rouge: La Goulue, Una tarde de domingo, Émile Bernard, Georges Seurat, Realismo, Pierre-Auguste Renoir, El almuerzo de los remeros, Impresión, sol naciente, Edgar Degas, Claude Monet, Siglo XIX, El baño del niño, La cuna, La inundación en Port-Marly, Boulevard Montmartre, Alfred Sisley, Camille Pissarro, La clase de danza, Mary Cassatt, Berthe Morisot, Cubismo, Armory Show, Antropofagia, Modernismo brasileño, Inserción en circuitos ideológicos, Los guerreros, Cildo Meireles, Lygia Clark, Tarsila do Amaral, Lygia Pape, Dadaísmo, Primera Guerra Mundial, Zúrich, Danza vertical, Lunar Caustic, Sophie Taeuber-Arp, Tristan Tzara, Infinity Mirrored Room, Tan Tan Bo, Hot Spot, Modern Magic, Mirror Ball, Monir Shahroudy Farmanfarmaian, Magdalena, Semiotics of the Kitchen, Manhattan Real Estate Holdings, The Dinner Party, Escultura blanda, Bandera, Monograma, Fuente, Originalidad, One and Three Chairs, Joseph Kosuth, Reproducción, Siglo XX, Guerra civil española, Felix en el exilio, William Kentridge, Double Plot, El mar, Geta Brătescu, Guillermo Kuitca, Arte conceptual, Apuntes para la historia del arte, Óscar Murillo, Beatriz González, Belgrado, Teotihuacan, Jartum, Bucarest, Teherán, Seúl, Los Ángeles, Mantua, Bruselas, Nápoles, Amberes, Núremberg, La Habana, Buenos Aires, Bombay, Hanói, Johannesburgo, Lagos, Tierra desarrollando más raíces, Cage, Sokari Douglas Camp, El Anatsui, Praga, Toledo, Córdoba, Mezquita Azul, Alejandría, Benin City, La bouche du temps, Romuald Hazoumè, Cuzco, Tenochtitlan, Toledo, Constantinopla, El Cairo, Ibrahim el-Salahi, The Last Sound, Kioto, Pekín, Barcelona, Múnich, Milán, Atenas, Guernica, Antigüedad, Arte africano, Artistas de Djenné, Madera, Hormigón, Templo de Kukulkán, Columna de Trajano, Puerta de Ishtar, Edificio Bauhaus de Dessau, Casa de la Cascada, Teatro de Epidauro, Panteón de Roma, Apollodoro de Damasco, Partenón, Calícrates, Ictino, Representación, Publicidad, Feminismo, Activismo, Trauma, Manuscrito, Queer, Discapacidad, Derechos culturales, Turismo cultural, Museología, Patrimonio inmaterial, Restauración, Conservación, Mercado del arte, Propiedad, Técnicas de reproducción, Cuerpo político, Accesibilidad, Museo, Exposición, Censura, Repatriación, Restitución, Patrimonio, Sostenibilidad urbana, Inteligencia artificial, Realidad virtual, Sonido, Vídeo, Tipografía, Diseño gráfico, Moda, Joyería, Textil, Cerámica, Folclore, Cultura popular, Paisaje rural, Paisaje urbano, Arquitectura doméstica, Teatro, Danza, Música, Poesía, Lenguaje, Traducción, Frontera colonial, Agua y política, Clima, Sostenibilidad, Distopía, Utopía, Esperanza, Duelo, Testimonio, Archivo vivo, Participación, Interactividad, Red, Digital, Globalización, Posmodernidad, Vanguardia, Escuela, Taller, Academia, Medios de masas, Industria, Trabajador, Pueblo, Territorio, Frontera, Nación, Secularización, Profano, Sagrado, Aire, Tierra, Fuego, Agua, Planta, Animal, Monstruo, Ruina, Fragmento, Huella, Sombra, Luz, Textura, Línea, Espacio, Escala, Ritmo, Proporción, Simetría, Tenebrism, Sfumato, Claroscuro, Perspectiva aérea, Canon, Alegoría, Icono, Mármol, Arquitectura, Religión, Vidrio, Tapiz de Bayeux, Mezquita de Córdoba, Santa Sofía, Isidoro de Mileto, Antemio de Tralles, Campanile de Giotto, Gran Mezquita de Samarra, Cristo Pantocrátor, Dionisio, Giotto di Bondone, Gótico, Románico, Arte islámico, Arte bizantino.

### Top hubs

| Entity                  | Class/type                 | Degree | Incoming | Outgoing |
| ----------------------- | -------------------------- | -----: | -------: | -------: |
| Representación          | `ABSTRACTION` / `CONCEPT`  |    218 |      218 |        0 |
| Siglo XX                | `ABSTRACTION` / `PERIOD`   |    213 |      213 |        0 |
| París                   | `PLACE` / `PLACE`          |     98 |       98 |        0 |
| Siglo XIX               | `ABSTRACTION` / `PERIOD`   |     92 |       92 |        0 |
| Nueva York              | `PLACE` / `PLACE`          |     71 |       71 |        0 |
| Arte conceptual         | `ABSTRACTION` / `MOVEMENT` |     57 |       53 |        4 |
| Antigüedad              | `ABSTRACTION` / `PERIOD`   |     52 |       52 |        0 |
| Edad Moderna            | `ABSTRACTION` / `PERIOD`   |     42 |       42 |        0 |
| Ciudad                  | `ABSTRACTION` / `CONCEPT`  |     40 |       39 |        1 |
| Renacimiento            | `ABSTRACTION` / `PERIOD`   |     31 |       31 |        0 |
| Fotografía              | `ABSTRACTION` / `CONCEPT`  |     28 |       27 |        1 |
| Materialidad            | `ABSTRACTION` / `CONCEPT`  |     28 |       27 |        1 |
| Religión                | `ABSTRACTION` / `CONCEPT`  |     28 |       28 |        0 |
| Renacimiento italiano   | `ABSTRACTION` / `MOVEMENT` |     28 |       23 |        5 |
| Barroco                 | `ABSTRACTION` / `MOVEMENT` |     27 |       24 |        3 |
| Lienzo                  | `ABSTRACTION` / `CONCEPT`  |     26 |       26 |        0 |
| Pintura al óleo         | `ABSTRACTION` / `CONCEPT`  |     26 |       26 |        0 |
| Florencia               | `PLACE` / `PLACE`          |     23 |       23 |        0 |
| Realismo                | `ABSTRACTION` / `MOVEMENT` |     23 |       20 |        3 |
| Surrealismo             | `ABSTRACTION` / `MOVEMENT` |     22 |       18 |        4 |
| Roma                    | `PLACE` / `PLACE`          |     21 |       21 |        0 |
| Dadaísmo                | `ABSTRACTION` / `MOVEMENT` |     20 |       15 |        5 |
| Cuerpo                  | `ABSTRACTION` / `CONCEPT`  |     19 |       18 |        1 |
| Romanticismo            | `ABSTRACTION` / `MOVEMENT` |     19 |       16 |        3 |
| Autoría                 | `ABSTRACTION` / `CONCEPT`  |     18 |       17 |        1 |
| Guernica                | `WORK` / `ARTWORK`         |     18 |        0 |       18 |
| Impresionismo           | `ABSTRACTION` / `MOVEMENT` |     18 |       15 |        3 |
| Mito                    | `ABSTRACTION` / `CONCEPT`  |     18 |       17 |        1 |
| Naturaleza              | `ABSTRACTION` / `CONCEPT`  |     18 |       17 |        1 |
| Postimpresionismo       | `ABSTRACTION` / `MOVEMENT` |     18 |       15 |        3 |
| Tokio                   | `PLACE` / `PLACE`          |     18 |       18 |        0 |
| Bauhaus                 | `ABSTRACTION` / `MOVEMENT` |     17 |       14 |        3 |
| Londres                 | `PLACE` / `PLACE`          |     17 |       17 |        0 |
| Minimalismo             | `ABSTRACTION` / `MOVEMENT` |     17 |       14 |        3 |
| Paisaje                 | `ABSTRACTION` / `CONCEPT`  |     17 |       16 |        1 |
| Reproducción            | `ABSTRACTION` / `CONCEPT`  |     17 |       16 |        1 |
| Retrato                 | `ABSTRACTION` / `CONCEPT`  |     17 |       17 |        0 |
| Mármol                  | `ABSTRACTION` / `CONCEPT`  |     16 |       15 |        1 |
| Arte africano           | `ABSTRACTION` / `MOVEMENT` |     15 |       13 |        2 |
| Espacio público         | `ABSTRACTION` / `CONCEPT`  |     15 |       14 |        1 |
| Expresionismo abstracto | `ABSTRACTION` / `MOVEMENT` |     15 |       12 |        3 |
| La gran ola de Kanagawa | `WORK` / `ARTWORK`         |     15 |        0 |       15 |
| Las Meninas             | `WORK` / `ARTWORK`         |     15 |        0 |       15 |
| Arquitectura            | `ABSTRACTION` / `CONCEPT`  |     14 |       14 |        0 |
| Arte griego             | `ABSTRACTION` / `MOVEMENT` |     14 |       10 |        4 |
| Berlín                  | `PLACE` / `PLACE`          |     14 |       14 |        0 |
| Casa de la Cascada      | `WORK` / `ARTWORK`         |     13 |        0 |       13 |
| Ciudad de México        | `PLACE` / `PLACE`          |     13 |       13 |        0 |
| Cubismo                 | `ABSTRACTION` / `MOVEMENT` |     13 |        9 |        4 |
| Edad Media              | `ABSTRACTION` / `PERIOD`   |     13 |       13 |        0 |

## 15. Real Exploration Paths

### Leonardo da Vinci

Leonardo da Vinci → Renacimiento → Renacimiento italiano
Leonardo da Vinci → Renacimiento → Renacimiento nórdico
Leonardo da Vinci → Renacimiento → Jan van Eyck
Leonardo da Vinci → Renacimiento → Albrecht Dürer
Leonardo da Vinci → Renacimiento → Pieter Bruegel el Viejo
Leonardo da Vinci → Renacimiento → Masaccio
Leonardo da Vinci → Renacimiento → Donatello
Leonardo da Vinci → Renacimiento → Fra Angelico
Leonardo da Vinci → Renacimiento → Piero della Francesca
Leonardo da Vinci → Renacimiento → Andrea Mantegna
Leonardo da Vinci → Renacimiento → Giorgione
Leonardo da Vinci → Renacimiento → La expulsión del paraíso
Leonardo da Vinci → Renacimiento → San Jorge
Leonardo da Vinci → Renacimiento → La flagelación de Cristo
Leonardo da Vinci → Renacimiento → Cámara de los esposos
Leonardo da Vinci → Renacimiento → La tempestad
Leonardo da Vinci → Renacimiento → Retrato de Giovanni Arnolfini
Leonardo da Vinci → Renacimiento → Melancolía I
Leonardo da Vinci → Renacimiento → Cazadores en la nieve
Leonardo da Vinci → Renacimiento → La Anunciación
Leonardo da Vinci → Renacimiento → Sandro Botticelli
Leonardo da Vinci → Renacimiento → Tiziano Vecellio
Leonardo da Vinci → Renacimiento → El nacimie

### Diego Velázquez

Diego Velázquez → Edad Moderna → Manierismo
Diego Velázquez → Edad Moderna → Barroco
Diego Velázquez → Edad Moderna → Rococo
Diego Velázquez → Edad Moderna → Peter Paul Rubens
Diego Velázquez → Edad Moderna → Artemisia Gentileschi
Diego Velázquez → Edad Moderna → José de Ribera
Diego Velázquez → Edad Moderna → Bartolomé Esteban Murillo
Diego Velázquez → Edad Moderna → Canaletto
Diego Velázquez → Edad Moderna → El Gran Canal
Diego Velázquez → Edad Moderna → Pontormo
Diego Velázquez → Edad Moderna → Annibale Carracci
Diego Velázquez → Edad Moderna → Guido Reni
Diego Velázquez → Edad Moderna → Frans Hals
Diego Velázquez → Edad Moderna → Georges de La Tour
Diego Velázquez → Edad Moderna → Antoine Watteau
Diego Velázquez → Edad Moderna → François Boucher
Diego Velázquez → Edad Moderna → Jean-Honoré Fragonard
Diego Velázquez → Edad Moderna → La Virgen del cuello largo
Diego Velázquez → Edad Moderna → Rapto de las sabinas
Diego Velázquez → Edad Moderna → Asunción de la Virgen
Diego Velázquez → Edad Moderna → Hipómenes y Atalanta
Diego Velázquez → Edad Moderna → La Magdalena penitente
Diego Velázquez → Edad Moderna → Fiesta de amor
Diego Velázquez → Edad Moderna → El banquete de Cleopatra

### Francisco de Goya

Francisco de Goya → Siglo XIX → Neoclasicismo
Francisco de Goya → Siglo XIX → Romanticismo
Francisco de Goya → Siglo XIX → Realismo
Francisco de Goya → Siglo XIX → Impresionismo
Francisco de Goya → Siglo XIX → Postimpresionismo
Francisco de Goya → Siglo XIX → Simbolismo
Francisco de Goya → Siglo XIX → Arts and Crafts
Francisco de Goya → Siglo XIX → Art Nouveau
Francisco de Goya → Siglo XIX → William Blake
Francisco de Goya → Siglo XIX → J. M. W. Turner
Francisco de Goya → Siglo XIX → John Constable
Francisco de Goya → Siglo XIX → Rosa Bonheur
Francisco de Goya → Siglo XIX → Berthe Morisot
Francisco de Goya → Siglo XIX → Mary Cassatt
Francisco de Goya → Siglo XIX → Odilon Redon
Francisco de Goya → Siglo XIX → Gustav Klimt
Francisco de Goya → Siglo XIX → Lluvia, vapor y velocidad
Francisco de Goya → Siglo XIX → La clase de danza
Francisco de Goya → Siglo XIX → El beso
Francisco de Goya → Siglo XIX → Retrato de Adele Bloch-Bauer I
Francisco de Goya → Siglo XIX → Vasily Vereshchagin
Francisco de Goya → Siglo XIX → Angelica Kauffmann
Francisco de Goya → Siglo XIX → Antonio Canova
Francisco de Goya → Siglo XIX → Théodore Géricault
Francisco de Goya → Siglo XIX → Caspar David Friedrich
Fr

### Claude Monet

Claude Monet → París → Rosa Bonheur
Claude Monet → París → Berthe Morisot
Claude Monet → París → Mary Cassatt
Claude Monet → París → Odilon Redon
Claude Monet → París → Max Ernst
Claude Monet → París → Meret Oppenheim
Claude Monet → París → Alexander Calder
Claude Monet → París → Constantin Brâncuși
Claude Monet → París → Georges de La Tour
Claude Monet → París → Antoine Watteau
Claude Monet → París → François Boucher
Claude Monet → París → Jean-Honoré Fragonard
Claude Monet → París → Théodore Géricault
Claude Monet → París → Honoré Daumier
Claude Monet → París → Jean-François Millet
Claude Monet → París → Gustave Moreau
Claude Monet → París → Camille Pissarro
Claude Monet → París → Alfred Sisley
Claude Monet → París → Émile Bernard
Claude Monet → París → Man Ray
Claude Monet → París → Francis Picabia
Claude Monet → París → Robert Delaunay
Claude Monet → París → Henri de Toulouse-Lautrec
Claude Monet → París → Carlos Cruz-Diez
Claude Monet → París → Sophie Calle
Claude Monet → París → Piet Mondrian
Claude Monet → París → Jean Fautrier
Claude Monet → París → Jacques-Louis David
Claude Monet → París → Eugène Delacroix
Claude Monet → París → Gustave Courbet
Claude Monet → París → Édou

### Pablo Picasso

Pablo Picasso → Siglo XX → Fotografía moderna
Pablo Picasso → Siglo XX → Fauvismo
Pablo Picasso → Siglo XX → Expresionismo
Pablo Picasso → Siglo XX → Futurismo
Pablo Picasso → Siglo XX → Suprematismo
Pablo Picasso → Siglo XX → Constructivismo
Pablo Picasso → Siglo XX → Dadaísmo
Pablo Picasso → Siglo XX → De Stijl
Pablo Picasso → Siglo XX → Bauhaus
Pablo Picasso → Siglo XX → Surrealismo
Pablo Picasso → Siglo XX → Arte de performance
Pablo Picasso → Siglo XX → Minimalismo
Pablo Picasso → Siglo XX → Arte conceptual
Pablo Picasso → Siglo XX → Fluxus
Pablo Picasso → Siglo XX → Land Art
Pablo Picasso → Siglo XX → Muralismo mexicano
Pablo Picasso → Siglo XX → Arquitectura moderna
Pablo Picasso → Siglo XX → Pop Art
Pablo Picasso → Siglo XX → Egon Schiele
Pablo Picasso → Siglo XX → Ernst Ludwig Kirchner
Pablo Picasso → Siglo XX → Paul Klee
Pablo Picasso → Siglo XX → El Lissitzky
Pablo Picasso → Siglo XX → Hannah Höch
Pablo Picasso → Siglo XX → René Magritte
Pablo Picasso → Siglo XX → Max Ernst
Pablo Picasso → Siglo XX → Alexander Calder
Pablo Picasso → Siglo XX → Eva Hesse
Pablo Picasso → Siglo XX → Donald Judd
Pablo Picasso → Siglo XX → Sol LeWitt
Pablo Picasso → Siglo XX → Agnes Martin
Pa

### Marcel Duchamp

Marcel Duchamp → Siglo XX → Fotografía moderna
Marcel Duchamp → Siglo XX → Fauvismo
Marcel Duchamp → Siglo XX → Expresionismo
Marcel Duchamp → Siglo XX → Futurismo
Marcel Duchamp → Siglo XX → Suprematismo
Marcel Duchamp → Siglo XX → Constructivismo
Marcel Duchamp → Siglo XX → Dadaísmo
Marcel Duchamp → Siglo XX → De Stijl
Marcel Duchamp → Siglo XX → Bauhaus
Marcel Duchamp → Siglo XX → Surrealismo
Marcel Duchamp → Siglo XX → Arte de performance
Marcel Duchamp → Siglo XX → Minimalismo
Marcel Duchamp → Siglo XX → Arte conceptual
Marcel Duchamp → Siglo XX → Fluxus
Marcel Duchamp → Siglo XX → Land Art
Marcel Duchamp → Siglo XX → Muralismo mexicano
Marcel Duchamp → Siglo XX → Arquitectura moderna
Marcel Duchamp → Siglo XX → Pop Art
Marcel Duchamp → Siglo XX → Egon Schiele
Marcel Duchamp → Siglo XX → Ernst Ludwig Kirchner
Marcel Duchamp → Siglo XX → Paul Klee
Marcel Duchamp → Siglo XX → El Lissitzky
Marcel Duchamp → Siglo XX → Hannah Höch
Marcel Duchamp → Siglo XX → René Magritte
Marcel Duchamp → Siglo XX → Max Ernst
Marcel Duchamp → Siglo XX → Alexander Calder
Marcel Duchamp → Siglo XX → Eva Hesse
Marcel Duchamp → Siglo XX → Donald Judd
Marcel Duchamp → Siglo XX → Sol LeWitt
Marcel Ducham

### Frida Kahlo

Frida Kahlo → Siglo XX → Fotografía moderna
Frida Kahlo → Siglo XX → Fauvismo
Frida Kahlo → Siglo XX → Expresionismo
Frida Kahlo → Siglo XX → Futurismo
Frida Kahlo → Siglo XX → Suprematismo
Frida Kahlo → Siglo XX → Constructivismo
Frida Kahlo → Siglo XX → Dadaísmo
Frida Kahlo → Siglo XX → De Stijl
Frida Kahlo → Siglo XX → Bauhaus
Frida Kahlo → Siglo XX → Surrealismo
Frida Kahlo → Siglo XX → Arte de performance
Frida Kahlo → Siglo XX → Minimalismo
Frida Kahlo → Siglo XX → Arte conceptual
Frida Kahlo → Siglo XX → Fluxus
Frida Kahlo → Siglo XX → Land Art
Frida Kahlo → Siglo XX → Muralismo mexicano
Frida Kahlo → Siglo XX → Arquitectura moderna
Frida Kahlo → Siglo XX → Pop Art
Frida Kahlo → Siglo XX → Egon Schiele
Frida Kahlo → Siglo XX → Ernst Ludwig Kirchner
Frida Kahlo → Siglo XX → Paul Klee
Frida Kahlo → Siglo XX → El Lissitzky
Frida Kahlo → Siglo XX → Hannah Höch
Frida Kahlo → Siglo XX → René Magritte
Frida Kahlo → Siglo XX → Max Ernst
Frida Kahlo → Siglo XX → Alexander Calder
Frida Kahlo → Siglo XX → Eva Hesse
Frida Kahlo → Siglo XX → Donald Judd
Frida Kahlo → Siglo XX → Sol LeWitt
Frida Kahlo → Siglo XX → Agnes Martin
Frida Kahlo → Siglo XX → Shirin Neshat
Frida Kahlo → Siglo XX

### Renacimiento

Renacimiento → Renacimiento italiano → Masaccio
Renacimiento → Renacimiento italiano → Fra Angelico
Renacimiento → Renacimiento italiano → Piero della Francesca
Renacimiento → Renacimiento italiano → Andrea Mantegna
Renacimiento → Renacimiento italiano → Giorgione
Renacimiento → Renacimiento italiano → La expulsión del paraíso
Renacimiento → Renacimiento italiano → San Jorge
Renacimiento → Renacimiento italiano → La flagelación de Cristo
Renacimiento → Renacimiento italiano → La tempestad
Renacimiento → Renacimiento italiano → La Anunciación
Renacimiento → Renacimiento italiano → Leonardo da Vinci
Renacimiento → Renacimiento italiano → Miguel Ángel
Renacimiento → Renacimiento italiano → Rafael
Renacimiento → Renacimiento italiano → Sandro Botticelli
Renacimiento → Renacimiento italiano → Tiziano Vecellio
Renacimiento → Renacimiento italiano → El nacimiento de Venus
Renacimiento → Renacimiento italiano → La última cena
Renacimiento → Renacimiento italiano → La escuela de Atenas
Renacimiento → Renacimiento italiano → Venus de Urbino
Renacimiento → Renacimiento italiano → David
Renacimiento → Renacimiento italiano → Arte romano
Renacimiento → Renacimiento italiano → Perspectiva
Renaci

### Barroco

Barroco → Edad Moderna → Manierismo
Barroco → Edad Moderna → Rococo
Barroco → Edad Moderna → Peter Paul Rubens
Barroco → Edad Moderna → Artemisia Gentileschi
Barroco → Edad Moderna → José de Ribera
Barroco → Edad Moderna → Bartolomé Esteban Murillo
Barroco → Edad Moderna → Canaletto
Barroco → Edad Moderna → El Gran Canal
Barroco → Edad Moderna → Pontormo
Barroco → Edad Moderna → Annibale Carracci
Barroco → Edad Moderna → Guido Reni
Barroco → Edad Moderna → Frans Hals
Barroco → Edad Moderna → Georges de La Tour
Barroco → Edad Moderna → Antoine Watteau
Barroco → Edad Moderna → François Boucher
Barroco → Edad Moderna → Jean-Honoré Fragonard
Barroco → Edad Moderna → La Virgen del cuello largo
Barroco → Edad Moderna → Rapto de las sabinas
Barroco → Edad Moderna → Asunción de la Virgen
Barroco → Edad Moderna → Hipómenes y Atalanta
Barroco → Edad Moderna → La Magdalena penitente
Barroco → Edad Moderna → Fiesta de amor
Barroco → Edad Moderna → El banquete de Cleopatra
Barroco → Edad Moderna → El columpio
Barroco → Edad Moderna → La elevación de la cruz
Barroco → Edad Moderna → Judith y su doncella
Barroco → Edad Moderna → El patizambo
Barroco → Edad Moderna → Inmaculada de Soult
Barroco →

### Cubismo

Cubismo → Siglo XX → Fotografía moderna
Cubismo → Siglo XX → Fauvismo
Cubismo → Siglo XX → Expresionismo
Cubismo → Siglo XX → Futurismo
Cubismo → Siglo XX → Suprematismo
Cubismo → Siglo XX → Constructivismo
Cubismo → Siglo XX → Dadaísmo
Cubismo → Siglo XX → De Stijl
Cubismo → Siglo XX → Bauhaus
Cubismo → Siglo XX → Surrealismo
Cubismo → Siglo XX → Arte de performance
Cubismo → Siglo XX → Minimalismo
Cubismo → Siglo XX → Arte conceptual
Cubismo → Siglo XX → Fluxus
Cubismo → Siglo XX → Land Art
Cubismo → Siglo XX → Muralismo mexicano
Cubismo → Siglo XX → Arquitectura moderna
Cubismo → Siglo XX → Pop Art
Cubismo → Siglo XX → Egon Schiele
Cubismo → Siglo XX → Ernst Ludwig Kirchner
Cubismo → Siglo XX → Paul Klee
Cubismo → Siglo XX → El Lissitzky
Cubismo → Siglo XX → Hannah Höch
Cubismo → Siglo XX → René Magritte
Cubismo → Siglo XX → Max Ernst
Cubismo → Siglo XX → Alexander Calder
Cubismo → Siglo XX → Eva Hesse
Cubismo → Siglo XX → Donald Judd
Cubismo → Siglo XX → Sol LeWitt
Cubismo → Siglo XX → Agnes Martin
Cubismo → Siglo XX → Shirin Neshat
Cubismo → Siglo XX → Theaster Gates
Cubismo → Siglo XX → Tarsila do Amaral
Cubismo → Siglo XX → Wifredo Lam
Cubismo → Siglo XX → Remedios Varo
Cubi

### Surrealismo

Surrealismo → Siglo XX → Fotografía moderna
Surrealismo → Siglo XX → Fauvismo
Surrealismo → Siglo XX → Expresionismo
Surrealismo → Siglo XX → Futurismo
Surrealismo → Siglo XX → Suprematismo
Surrealismo → Siglo XX → Constructivismo
Surrealismo → Siglo XX → Dadaísmo
Surrealismo → Siglo XX → De Stijl
Surrealismo → Siglo XX → Bauhaus
Surrealismo → Siglo XX → Arte de performance
Surrealismo → Siglo XX → Minimalismo
Surrealismo → Siglo XX → Arte conceptual
Surrealismo → Siglo XX → Fluxus
Surrealismo → Siglo XX → Land Art
Surrealismo → Siglo XX → Muralismo mexicano
Surrealismo → Siglo XX → Arquitectura moderna
Surrealismo → Siglo XX → Pop Art
Surrealismo → Siglo XX → Egon Schiele
Surrealismo → Siglo XX → Ernst Ludwig Kirchner
Surrealismo → Siglo XX → Paul Klee
Surrealismo → Siglo XX → El Lissitzky
Surrealismo → Siglo XX → Hannah Höch
Surrealismo → Siglo XX → René Magritte
Surrealismo → Siglo XX → Max Ernst
Surrealismo → Siglo XX → Alexander Calder
Surrealismo → Siglo XX → Eva Hesse
Surrealismo → Siglo XX → Donald Judd
Surrealismo → Siglo XX → Sol LeWitt
Surrealismo → Siglo XX → Agnes Martin
Surrealismo → Siglo XX → Shirin Neshat
Surrealismo → Siglo XX → Theaster Gates
Surrealismo → Siglo

### Cuerpo

Cuerpo → Representación → Autorretrato
Cuerpo → Representación → Red House
Cuerpo → Representación → Composición con rojo, azul y amarillo
Cuerpo → Representación → Icono
Cuerpo → Representación → Alegoría
Cuerpo → Representación → Canon
Cuerpo → Representación → Perspectiva aérea
Cuerpo → Representación → Claroscuro
Cuerpo → Representación → Sfumato
Cuerpo → Representación → Tenebrism
Cuerpo → Representación → Ornamento
Cuerpo → Representación → Simetría
Cuerpo → Representación → Proporción
Cuerpo → Representación → Ritmo
Cuerpo → Representación → Escala
Cuerpo → Representación → Espacio
Cuerpo → Representación → Color
Cuerpo → Representación → Línea
Cuerpo → Representación → Textura
Cuerpo → Representación → Luz
Cuerpo → Representación → Sombra
Cuerpo → Representación → Huella
Cuerpo → Representación → Fragmento
Cuerpo → Representación → Ruina
Cuerpo → Representación → Monstruo
Cuerpo → Representación → Animal
Cuerpo → Representación → Planta
Cuerpo → Representación → Agua
Cuerpo → Representación → Fuego
Cuerpo → Representación → Tierra
Cuerpo → Representación → Aire
Cuerpo → Representación → Sagrado
Cuerpo → Representación → Profano
Cuerpo → Representación → Secularización
Cuerp

### Guerra

Guerra → Guernica → Archivo
Guerra → Guernica → Ciudad
Guerra → Guernica → Exilio
Guerra → Guernica → Memoria
Guerra → Guernica → Pintura de historia
Guerra → Guernica → Propaganda
Guerra → Guernica → Revolución
Guerra → Guernica → Mural
Guerra → Guernica → Pablo Picasso
Guerra → Guernica → Cubismo
Guerra → Guernica → Pintura al óleo
Guerra → Guernica → Lienzo
Guerra → Guernica → Violencia
Guerra → Guernica → Museo Reina Sofía
Guerra → Guernica → Guerra civil española
Guerra → Guernica → Siglo XX
Guerra → Guernica → París
Guerra → El 3 de mayo de 1808 → Aguafuerte
Guerra → El 3 de mayo de 1808 → Grabado
Guerra → El 3 de mayo de 1808 → Francisco de Goya
Guerra → El 3 de mayo de 1808 → Romanticismo
Guerra → El 3 de mayo de 1808 → Violencia
Guerra → El 3 de mayo de 1808 → Museo del Prado
Guerra → El 3 de mayo de 1808 → Muerte
Guerra → El 3 de mayo de 1808 → Pintura al óleo
Guerra → El 3 de mayo de 1808 → Madrid
Guerra → El 3 de mayo de 1808 → Lienzo
Guerra → El 3 de mayo de 1808 → Siglo XIX
Guerra → From Here I Saw What Happened → Carrie Mae Weems
Guerra → From Here I Saw What Happened → Fotografía
Guerra → From Here I Saw What Happened → Archivo
Guerra → From Here I Saw What Happened

### Retrato

Retrato → Las Meninas → Clase social
Retrato → Las Meninas → Espectáculo
Retrato → Las Meninas → Mirada
Retrato → Las Meninas → Perspectiva lineal
Retrato → Las Meninas → Representación
Retrato → Las Meninas → Domesticidad
Retrato → Las Meninas → Diego Velázquez
Retrato → Las Meninas → Barroco
Retrato → Las Meninas → Pintura al óleo
Retrato → Las Meninas → Lienzo
Retrato → Las Meninas → Museo del Prado
Retrato → Las Meninas → Edad Moderna
Retrato → Las Meninas → Cuerpo
Retrato → Las Meninas → Madrid
Retrato → Las dos Fridas → Autorretrato
Retrato → Las dos Fridas → Cuidado
Retrato → Las dos Fridas → Género
Retrato → Las dos Fridas → Identidad
Retrato → Las dos Fridas → Vida
Retrato → Las dos Fridas → Frida Kahlo
Retrato → Las dos Fridas → Muralismo mexicano
Retrato → Las dos Fridas → Pintura al óleo
Retrato → Las dos Fridas → Lienzo
Retrato → Las dos Fridas → Siglo XX
Retrato → Las dos Fridas → Cuerpo
Retrato → Las dos Fridas → Ciudad de México
Retrato → Olympia → Deseo
Retrato → Olympia → Desnudo
Retrato → Olympia → Género
Retrato → Olympia → Mirada
Retrato → Olympia → Sexualidad
Retrato → Olympia → Édouard Manet
Retrato → Olympia → Pintura al óleo
Retrato → Olympia → Lienzo
Retra

### Fotografía

Fotografía → From Here I Saw What Happened → Carrie Mae Weems
Fotografía → From Here I Saw What Happened → Archivo
Fotografía → From Here I Saw What Happened → Cine
Fotografía → From Here I Saw What Happened → Colonialismo
Fotografía → From Here I Saw What Happened → Diáspora
Fotografía → From Here I Saw What Happened → Esclavitud
Fotografía → From Here I Saw What Happened → Migración
Fotografía → From Here I Saw What Happened → Raza
Fotografía → From Here I Saw What Happened → Guerra
Fotografía → From Here I Saw What Happened → Violencia
Fotografía → From Here I Saw What Happened → Nueva York
Fotografía → Madre migrante → Clase social
Fotografía → Madre migrante → Migración
Fotografía → Madre migrante → Película fotográfica
Fotografía → Madre migrante → Raza
Fotografía → Madre migrante → Trabajo
Fotografía → Madre migrante → Dorothea Lange
Fotografía → Madre migrante → Memoria
Fotografía → Madre migrante → Película fotográfica
Fotografía → Madre migrante → Nueva York
Fotografía → Faces and Phases → Zanele Muholi
Fotografía → Faces and Phases → Fotografía moderna
Fotografía → Faces and Phases → Siglo XX
Fotografía → Faces and Phases → Retrato
Fotografía → Faces and Phases → Cuerpo

### Florencia

Florencia → El nacimiento de Venus → Deseo
Florencia → El nacimiento de Venus → Iconografía
Florencia → El nacimiento de Venus → Vida
Florencia → El nacimiento de Venus → Sandro Botticelli
Florencia → El nacimiento de Venus → Renacimiento italiano
Florencia → El nacimiento de Venus → Pintura al óleo
Florencia → El nacimiento de Venus → Lienzo
Florencia → El nacimiento de Venus → Galería Uffizi
Florencia → El nacimiento de Venus → Renacimiento
Florencia → El nacimiento de Venus → Mito
Florencia → El nacimiento de Venus → Religión
Florencia → El nacimiento de Venus → Belleza
Florencia → David → Desnudo
Florencia → David → Fundición
Florencia → David → Mármol
Florencia → David → Talla
Florencia → David → Renacimiento italiano
Florencia → David → Miguel Ángel
Florencia → David → Renacimiento
Florencia → David → Retrato
Florencia → David → Cuerpo
Florencia → David → Pintura al óleo
Florencia → David → Lienzo
Florencia → La Gioconda → Belleza
Florencia → La Gioconda → Dibujo
Florencia → La Gioconda → Representación
Florencia → La Gioconda → Leonardo da Vinci
Florencia → La Gioconda → Pintura al óleo
Florencia → La Gioconda → Lienzo
Florencia → La Gioconda → Museo del Louvre
Florencia → L

### París

París → Guernica → Archivo
París → Guernica → Ciudad
París → Guernica → Exilio
París → Guernica → Memoria
París → Guernica → Pintura de historia
París → Guernica → Propaganda
París → Guernica → Revolución
París → Guernica → Mural
París → Guernica → Pablo Picasso
París → Guernica → Cubismo
París → Guernica → Pintura al óleo
París → Guernica → Lienzo
París → Guernica → Guerra
París → Guernica → Violencia
París → Guernica → Museo Reina Sofía
París → Guernica → Guerra civil española
París → Guernica → Siglo XX
París → Olympia → Deseo
París → Olympia → Desnudo
París → Olympia → Género
París → Olympia → Mirada
París → Olympia → Sexualidad
París → Olympia → Édouard Manet
París → Olympia → Retrato
París → Olympia → Pintura al óleo
París → Olympia → Lienzo
París → Olympia → Siglo XIX
París → Olympia → Cuerpo
París → Olympia → Realismo
París → La noche estrellada → Melancolía
París → La noche estrellada → Naturaleza
París → La noche estrellada → Sublime
París → La noche estrellada → Instituto de Arte de Chicago
París → La noche estrellada → Vincent van Gogh
París → La noche estrellada → Postimpresionismo
París → La noche estrellada → Pintura al óleo
París → La noche estrellada → Lienzo
París

### Museo del Prado

Museo del Prado → Las Meninas → Clase social
Museo del Prado → Las Meninas → Espectáculo
Museo del Prado → Las Meninas → Mirada
Museo del Prado → Las Meninas → Perspectiva lineal
Museo del Prado → Las Meninas → Representación
Museo del Prado → Las Meninas → Domesticidad
Museo del Prado → Las Meninas → Diego Velázquez
Museo del Prado → Las Meninas → Barroco
Museo del Prado → Las Meninas → Pintura al óleo
Museo del Prado → Las Meninas → Lienzo
Museo del Prado → Las Meninas → Retrato
Museo del Prado → Las Meninas → Edad Moderna
Museo del Prado → Las Meninas → Cuerpo
Museo del Prado → Las Meninas → Madrid
Museo del Prado → El 3 de mayo de 1808 → Aguafuerte
Museo del Prado → El 3 de mayo de 1808 → Grabado
Museo del Prado → El 3 de mayo de 1808 → Francisco de Goya
Museo del Prado → El 3 de mayo de 1808 → Romanticismo
Museo del Prado → El 3 de mayo de 1808 → Guerra
Museo del Prado → El 3 de mayo de 1808 → Violencia
Museo del Prado → El 3 de mayo de 1808 → Muerte
Museo del Prado → El 3 de mayo de 1808 → Pintura al óleo
Museo del Prado → El 3 de mayo de 1808 → Madrid
Museo del Prado → El 3 de mayo de 1808 → Lienzo
Museo del Prado → El 3 de mayo de 1808 → Siglo XIX
Museo del Prado → Madrid →

### Representación

Representación → Ciudad → Guernica
Representación → Ciudad → Casa de la Cascada
Representación → Ciudad → Atenas
Representación → Ciudad → Milán
Representación → Ciudad → Múnich
Representación → Ciudad → Barcelona
Representación → Ciudad → Pekín
Representación → Ciudad → Kioto
Representación → Ciudad → El Cairo
Representación → Ciudad → Constantinopla
Representación → Ciudad → Toledo
Representación → Ciudad → Tenochtitlan
Representación → Ciudad → Cuzco
Representación → Ciudad → Benin City
Representación → Ciudad → Alejandría
Representación → Ciudad → Córdoba
Representación → Ciudad → Toledo
Representación → Ciudad → Praga
Representación → Ciudad → Lagos
Representación → Ciudad → Johannesburgo
Representación → Ciudad → Hanói
Representación → Ciudad → Bombay
Representación → Ciudad → Buenos Aires
Representación → Ciudad → La Habana
Representación → Ciudad → Núremberg
Representación → Ciudad → Amberes
Representación → Ciudad → Nápoles
Representación → Ciudad → Bruselas
Representación → Ciudad → Mantua
Representación → Ciudad → Los Ángeles
Representación → Ciudad → Seúl
Representación → Ciudad → Teherán
Representación → Ciudad → Bucarest
Representación → Ciudad → Jartum
Representación

### Siglo XX

Siglo XX → Arte conceptual → Sol LeWitt
Siglo XX → Arte conceptual → Theaster Gates
Siglo XX → Arte conceptual → One and Three Chairs
Siglo XX → Arte conceptual → Tropicália
Siglo XX → Arte conceptual → Judy Chicago
Siglo XX → Arte conceptual → Hans Haacke
Siglo XX → Arte conceptual → Martha Rosler
Siglo XX → Arte conceptual → Guillermo Kuitca
Siglo XX → Arte conceptual → Carlos Cruz-Diez
Siglo XX → Arte conceptual → Lygia Clark
Siglo XX → Arte conceptual → Lygia Pape
Siglo XX → Arte conceptual → Beatriz González
Siglo XX → Arte conceptual → Óscar Murillo
Siglo XX → Arte conceptual → Marlene Dumas
Siglo XX → Arte conceptual → Sophie Calle
Siglo XX → Arte conceptual → Walid Beshty
Siglo XX → Arte conceptual → Do Ho Suh
Siglo XX → Arte conceptual → Monir Shahroudy Farmanfarmaian
Siglo XX → Arte conceptual → Geta Brătescu
Siglo XX → Arte conceptual → Henrike Naumann
Siglo XX → Arte conceptual → Mona Hatoum
Siglo XX → Arte conceptual → Takashi Murakami
Siglo XX → Arte conceptual → Manhattan Real Estate Holdings
Siglo XX → Arte conceptual → Semiotics of the Kitchen
Siglo XX → Arte conceptual → El mar
Siglo XX → Arte conceptual → Fisicromía
Siglo XX → Arte conceptual → Los guerreros
Sigl

Todas las flechas son aristas seed reales; se recorre en ambos sentidos para exploración.

## 16. Chronological Coverage

- **Prehistoria:** 22 entidades fechadas.
- **Antigüedad:** 8 entidades fechadas.
- **Medieval:** 14 entidades fechadas.
- **Renacimiento:** 46 entidades fechadas.
- **XVII–XVIII:** 43 entidades fechadas.
- **XIX:** 102 entidades fechadas.
- **1900–1918:** 37 entidades fechadas.
- **Interwar:** 67 entidades fechadas.
- **Posguerra:** 65 entidades fechadas.
- **Finales XX:** 15 entidades fechadas.
- **2000+:** 18 entidades fechadas.
  Fuerte: XIX–contemporáneo. Aceptable: Renacimiento/Barroco. Débil: antes de 1400.

## 17. Geographic Coverage

Europa occidental domina por lugares, personas, obras y movimientos; París/Nueva York son los grandes hubs. Italia y España tienen alta densidad. Latinoamérica, Japón, India, África, China, Corea, Mesoamérica/Andes y mundo islámico tienen puntos de entrada reales, pero clusters menores. Esta lectura se basa en relaciones a PLACE, no en nacionalidad exhaustiva.

## 18. Discipline Coverage

Pintura domina; escultura, arquitectura y fotografía tienen base; obra gráfica y performance menor; diseño, cine/moving image y artes decorativas son principalmente vocabulario conceptual sin corpus equivalente.

## 19. Foundational Art History Coverage

| Área                                    | Estado     | Base real                                        |
| --------------------------------------- | ---------- | ------------------------------------------------ |
| Egipto / Grecia / Roma                  | **BASIC**  | movimientos, lugares y obras puntuales           |
| Medieval                                | **BASIC**  | bizantino, románico, gótico y obras              |
| Renacimiento / Barroco                  | **STRONG** | periodos, movimientos, artistas, obras, ciudades |
| XIX / Impresionismo / Postimpresionismo | **STRONG** | red amplia                                       |
| Cubismo / Surrealismo                   | **STRONG** | movimientos, artistas y obras                    |
| Dada / Expresionismo / Bauhaus          | **BASIC**  | puntos de entrada conectados                     |
| Fotografía / Arquitectura moderna       | **BASIC**  | autores, obras y conceptos                       |
| Posguerra / Pop / Minimal / Conceptual  | **BASIC**  | conceptual es especialmente hub                  |
| Japón / India / África / Latinoamérica  | **BASIC**  | anclas y algunas redes                           |
| China / Andes / Diseño                  | **WEAK**   | pocos nodos y continuidad menor                  |

## 20. Researcher Scenario Audit

- **Retrato Renacimiento — BASIC:** retrato, autorretrato, Renacimiento, Leonardo, Rafael, Van Eyck.
- **Arte y muerte — BASIC:** muerte, duelo, trauma, guerra, obras religiosas.
- **Cuerpo — STRONG:** cuerpo, desnudo, cuerpo político, obras y artistas modernos.
- **Guerra — STRONG:** guerra, violencia, propaganda, Guernica, Tres de mayo, eventos mundiales.
- **Cubismo / Surrealismo — STRONG:** movimientos, autores y obras directas.
- **Fotografía / Arquitectura moderna — BASIC:** conceptos, autores y obras de entrada.
- **Poder / Japón / Mesoamérica / mujeres / Latinoamérica / religión / ciudad — BASIC:** hay puntos de inicio concretos, no cobertura exhaustiva.

## 21. Current Metadata Completeness

| Campo        | PERSON  | WORK    | ABSTRACTION | PLACE | ORGANIZATION | EVENT |
| ------------ | ------- | ------- | ----------- | ----- | ------------ | ----- |
| `startYear`  | 199/201 | 224/224 | 9/265       | 0/54  | 0/18         | 6/6   |
| `endYear`    | 160/201 | 167/224 | 8/265       | 0/54  | 0/18         | 4/6   |
| `summary`    | 0/201   | 0/224   | 0/265       | 0/54  | 0/18         | 0/6   |
| `content`    | 0/201   | 0/224   | 0/265       | 0/54  | 0/18         | 0/6   |
| `aliases`    | 5/201   | 1/224   | 0/265       | 0/54  | 1/18         | 0/6   |
| `mediaLinks` | 0/201   | 0/224   | 0/265       | 0/54  | 0/18         | 0/6   |
| `sourceRefs` | 0/201   | 62/224  | 0/265       | 0/54  | 0/18         | 0/6   |
| `attributes` | 0/201   | 0/224   | 0/265       | 0/54  | 0/18         | 0/6   |

WORK with creator: 214/224. Entities with image: 0/768. Entities with summary: 0/768. Entities with essay: 0/768. Medium es relación USES_TECHNIQUE/USES_MATERIAL; atributos poblados: 0/768.

## 22. Potentially Surprising Omissions

### Critical

- Revisar continuidad premoderna/no occidental antes de nombrar ausencias individuales; no hay evidencia de fallo de seed.

### Useful

- Técnicas fotográficas históricas y artes decorativas: vocabulario actual limitado.

### Optional

- Especialización regional o de medios sólo tras definir línea editorial.

## 23. Suspicious Duplicates

- `toledo` / `toledo-espanol`: mismo canonical title, candidato claro a revisar.
- `Autorretrato` y `Sin título` aparecen varias veces, pero corresponden a obras distintas: no fusionar por título.

## 24. Granularity Problems

179 conceptos transversales frente a 6 eventos/18 organizaciones; 426 entidades con startYear ≥1950 frente a densidades mucho menores premodernas. Granularidad alta de teoría contemporánea sin equivalencia regional/disciplinar en varias tradiciones.

## 25. Bias Audit

Eurocentrismo y pintura altos; mujeres presentes pero menor densidad temprana; arquitectura/fotografía con base, diseño débil; artes no occidentales ancladas pero no equivalentes; concentración temporal 1800–presente y canónica en figuras famosas; instituciones mayoritariamente occidentales. Es diagnóstico estructural, no juicio moral.

## 26. What the Seed Already Does Well

Núcleo único de 768/768 nodos, semántica relacional explícita, fuertes rutas Renacimiento–contemporáneo, hubs conceptuales reales y puentes iniciales globales. La separación de estructura breve y ficha extensa está bien respetada.

## 27. Weak Areas

Cronología anterior a 1400, profundidad geográfica fuera de Europa/EE. UU., diseño/artes decorativas/cine, poca capa de eventos/instituciones y metadata visual/editorial deliberadamente vacía.

## 28. Recommended Tier A Editorial Enrichment

Criterio: centralidad, importancia histórica y utilidad investigadora. Tier A (125): **Representación** (ABSTRACTION/CONCEPT, 218), **Siglo XX** (ABSTRACTION/PERIOD, 213), **París** (PLACE/PLACE, 98), **Siglo XIX** (ABSTRACTION/PERIOD, 92), **Nueva York** (PLACE/PLACE, 71), **Arte conceptual** (ABSTRACTION/MOVEMENT, 57), **Antigüedad** (ABSTRACTION/PERIOD, 52), **Edad Moderna** (ABSTRACTION/PERIOD, 42), **Ciudad** (ABSTRACTION/CONCEPT, 40), **Renacimiento** (ABSTRACTION/PERIOD, 31), **Fotografía** (ABSTRACTION/CONCEPT, 28), **Materialidad** (ABSTRACTION/CONCEPT, 28), **Religión** (ABSTRACTION/CONCEPT, 28), **Renacimiento italiano** (ABSTRACTION/MOVEMENT, 28), **Barroco** (ABSTRACTION/MOVEMENT, 27), **Lienzo** (ABSTRACTION/CONCEPT, 26), **Pintura al óleo** (ABSTRACTION/CONCEPT, 26), **Florencia** (PLACE/PLACE, 23), **Realismo** (ABSTRACTION/MOVEMENT, 23), **Surrealismo** (ABSTRACTION/MOVEMENT, 22), **Roma** (PLACE/PLACE, 21), **Dadaísmo** (ABSTRACTION/MOVEMENT, 20), **Cuerpo** (ABSTRACTION/CONCEPT, 19), **Romanticismo** (ABSTRACTION/MOVEMENT, 19), **Autoría** (ABSTRACTION/CONCEPT, 18), **Guernica** (WORK/ARTWORK, 18), **Impresionismo** (ABSTRACTION/MOVEMENT, 18), **Mito** (ABSTRACTION/CONCEPT, 18), **Naturaleza** (ABSTRACTION/CONCEPT, 18), **Postimpresionismo** (ABSTRACTION/MOVEMENT, 18), **Tokio** (PLACE/PLACE, 18), **Bauhaus** (ABSTRACTION/MOVEMENT, 17), **Londres** (PLACE/PLACE, 17), **Minimalismo** (ABSTRACTION/MOVEMENT, 17), **Paisaje** (ABSTRACTION/CONCEPT, 17), **Reproducción** (ABSTRACTION/CONCEPT, 17), **Retrato** (ABSTRACTION/CONCEPT, 17), **Mármol** (ABSTRACTION/CONCEPT, 16), **Arte africano** (ABSTRACTION/MOVEMENT, 15), **Espacio público** (ABSTRACTION/CONCEPT, 15), **Expresionismo abstracto** (ABSTRACTION/MOVEMENT, 15), **La gran ola de Kanagawa** (WORK/ARTWORK, 15), **Las Meninas** (WORK/ARTWORK, 15), **Arquitectura** (ABSTRACTION/CONCEPT, 14), **Arte griego** (ABSTRACTION/MOVEMENT, 14), **Berlín** (PLACE/PLACE, 14), **Casa de la Cascada** (WORK/ARTWORK, 13), **Ciudad de México** (PLACE/PLACE, 13), **Cubismo** (ABSTRACTION/MOVEMENT, 13), **Edad Media** (ABSTRACTION/PERIOD, 13), **El nacimiento de Venus** (WORK/ARTWORK, 13), **Las dos Fridas** (WORK/ARTWORK, 13), **Maman** (WORK/ARTWORK, 13), **Muralismo mexicano** (ABSTRACTION/MOVEMENT, 13), **Neoclasicismo** (ABSTRACTION/MOVEMENT, 13), **Olympia** (WORK/ARTWORK, 13), **Arquitectura moderna** (ABSTRACTION/MOVEMENT, 12), **Busto de Nefertiti** (WORK/ARTWORK, 12), **David** (WORK/ARTWORK, 12), **Edificio Bauhaus de Dessau** (WORK/ARTWORK, 12), **El 3 de mayo de 1808** (WORK/ARTWORK, 12), **From Here I Saw What Happened** (WORK/ARTWORK, 12), **La Gioconda** (WORK/ARTWORK, 12), **La escuela de Atenas** (WORK/ARTWORK, 12), **Madre migrante** (WORK/ARTWORK, 12), **Memoria** (ABSTRACTION/CONCEPT, 12), **Película fotográfica** (ABSTRACTION/CONCEPT, 12), **Pop Art** (ABSTRACTION/MOVEMENT, 12), **Rococo** (ABSTRACTION/MOVEMENT, 12), **Ámsterdam** (PLACE/PLACE, 12), **Arte indio** (ABSTRACTION/MOVEMENT, 11), **Díptico de Marilyn** (WORK/ARTWORK, 11), **Guerra** (ABSTRACTION/CONCEPT, 11), **La noche estrellada** (WORK/ARTWORK, 11), **La última cena** (WORK/ARTWORK, 11), **Madrid** (PLACE/PLACE, 11), **Violencia** (ABSTRACTION/CONCEPT, 11), **Abstracción** (ABSTRACTION/CONCEPT, 10), **Arte romano** (ABSTRACTION/MOVEMENT, 10), **Constructivismo** (ABSTRACTION/MOVEMENT, 10), **El hombre en la encrucijada** (WORK/ARTWORK, 10), **El juramento de los Horacios** (WORK/ARTWORK, 10), **Faces and Phases** (WORK/ARTWORK, 10), **Fotografía moderna** (ABSTRACTION/MOVEMENT, 10), **Fuente** (WORK/ARTWORK, 10), **Gran Mezquita de Djenné** (WORK/ARTWORK, 10), **La joven de la perla** (WORK/ARTWORK, 10), **Lluvia repentina sobre el puente Ohashi** (WORK/ARTWORK, 10), **Moscú** (PLACE/PLACE, 10), **Seascapes** (WORK/ARTWORK, 10), **Talla** (ABSTRACTION/CONCEPT, 10), **Doríforo** (WORK/ARTWORK, 9), **La vocación de san Mateo** (WORK/ARTWORK, 9), **Mont Sainte-Victoire** (WORK/ARTWORK, 9), **Semillas de girasol** (WORK/ARTWORK, 9), **São Paulo** (PLACE/PLACE, 9), **Venus de Urbino** (WORK/ARTWORK, 9), **Art Nouveau** (ABSTRACTION/MOVEMENT, 8), **Dama con lámpara** (WORK/ARTWORK, 8), **Dama en la calle** (WORK/ARTWORK, 8), **Delhi** (PLACE/PLACE, 8), **El almuerzo de los remeros** (WORK/ARTWORK, 8), **El entierro del conde de Orgaz** (WORK/ARTWORK, 8), **Equivalentes** (WORK/ARTWORK, 8), **Freischwimmer** (WORK/ARTWORK, 8), **Impresión, sol naciente** (WORK/ARTWORK, 8), **La jungla** (WORK/ARTWORK, 8), **La ronda de noche** (WORK/ARTWORK, 8), **Las señoritas de Aviñón** (WORK/ARTWORK, 8), **Los girasoles** (WORK/ARTWORK, 8), **Manierismo** (ABSTRACTION/MOVEMENT, 8), **Psique reanimada por el beso** (WORK/ARTWORK, 8), **Rapto de las sabinas** (WORK/ARTWORK, 8), **Rayografía** (WORK/ARTWORK, 8), **Renacimiento nórdico** (ABSTRACTION/MOVEMENT, 8), **Santa Sofía** (WORK/ARTWORK, 8), **Saturno devorando a su hijo** (WORK/ARTWORK, 8), **Simbolismo** (ABSTRACTION/MOVEMENT, 8), **Ukiyo-e** (ABSTRACTION/MOVEMENT, 8), **Untitled Film Still #21** (WORK/ARTWORK, 8), **Weimar** (PLACE/PLACE, 8), **Aristóteles** (PERSON/ARTIST, 7), **Arte islámico** (ABSTRACTION/MOVEMENT, 7), **Bronces de Benín** (WORK/ARTWORK, 7), **Catedral de Chartres** (WORK/ARTWORK, 7).

Tier B: PERSON/WORK restantes con degree ≥4 y conectores. Tier C: técnicas, materiales, formatos y conceptos de baja conexión pueden seguir estructurales.

## 29. Image Priority

### IMAGE ESSENTIAL

Las 224 WORK; primera fase: 150 WORK de mayor degree.

### IMAGE VALUABLE

25 PERSON hub y 20 PLACE/ORGANIZATION identificables.

### IMAGE OPTIONAL

Movimientos, periodos, conceptos, técnicas y materiales.
**Primera fase:** ~195 imágenes, no 768.

## 30. Top 100 Human Review

|   # | Entity                                  | Class/type                 | Degree | Why review              |
| --: | --------------------------------------- | -------------------------- | -----: | ----------------------- |
|   1 | Representación                          | `ABSTRACTION` / `CONCEPT`  |    218 | hub transversal         |
|   2 | Siglo XX                                | `ABSTRACTION` / `PERIOD`   |    213 | hub transversal         |
|   3 | París                                   | `PLACE` / `PLACE`          |     98 | hub transversal         |
|   4 | Siglo XIX                               | `ABSTRACTION` / `PERIOD`   |     92 | hub transversal         |
|   5 | Nueva York                              | `PLACE` / `PLACE`          |     71 | hub transversal         |
|   6 | Arte conceptual                         | `ABSTRACTION` / `MOVEMENT` |     57 | hub transversal         |
|   7 | Antigüedad                              | `ABSTRACTION` / `PERIOD`   |     52 | hub transversal         |
|   8 | Edad Moderna                            | `ABSTRACTION` / `PERIOD`   |     42 | hub transversal         |
|   9 | Ciudad                                  | `ABSTRACTION` / `CONCEPT`  |     40 | hub transversal         |
|  10 | Renacimiento                            | `ABSTRACTION` / `PERIOD`   |     31 | hub transversal         |
|  11 | Fotografía                              | `ABSTRACTION` / `CONCEPT`  |     28 | entrada de alto impacto |
|  12 | Materialidad                            | `ABSTRACTION` / `CONCEPT`  |     28 | entrada de alto impacto |
|  13 | Religión                                | `ABSTRACTION` / `CONCEPT`  |     28 | entrada de alto impacto |
|  14 | Renacimiento italiano                   | `ABSTRACTION` / `MOVEMENT` |     28 | entrada de alto impacto |
|  15 | Barroco                                 | `ABSTRACTION` / `MOVEMENT` |     27 | entrada de alto impacto |
|  16 | Lienzo                                  | `ABSTRACTION` / `CONCEPT`  |     26 | entrada de alto impacto |
|  17 | Pintura al óleo                         | `ABSTRACTION` / `CONCEPT`  |     26 | entrada de alto impacto |
|  18 | Florencia                               | `PLACE` / `PLACE`          |     23 | entrada de alto impacto |
|  19 | Realismo                                | `ABSTRACTION` / `MOVEMENT` |     23 | entrada de alto impacto |
|  20 | Surrealismo                             | `ABSTRACTION` / `MOVEMENT` |     22 | entrada de alto impacto |
|  21 | Roma                                    | `PLACE` / `PLACE`          |     21 | entrada de alto impacto |
|  22 | Dadaísmo                                | `ABSTRACTION` / `MOVEMENT` |     20 | entrada de alto impacto |
|  23 | Cuerpo                                  | `ABSTRACTION` / `CONCEPT`  |     19 | entrada de alto impacto |
|  24 | Romanticismo                            | `ABSTRACTION` / `MOVEMENT` |     19 | entrada de alto impacto |
|  25 | Autoría                                 | `ABSTRACTION` / `CONCEPT`  |     18 | entrada de alto impacto |
|  26 | Guernica                                | `WORK` / `ARTWORK`         |     18 | entrada de alto impacto |
|  27 | Impresionismo                           | `ABSTRACTION` / `MOVEMENT` |     18 | entrada de alto impacto |
|  28 | Mito                                    | `ABSTRACTION` / `CONCEPT`  |     18 | entrada de alto impacto |
|  29 | Naturaleza                              | `ABSTRACTION` / `CONCEPT`  |     18 | entrada de alto impacto |
|  30 | Postimpresionismo                       | `ABSTRACTION` / `MOVEMENT` |     18 | entrada de alto impacto |
|  31 | Tokio                                   | `PLACE` / `PLACE`          |     18 | entrada de alto impacto |
|  32 | Bauhaus                                 | `ABSTRACTION` / `MOVEMENT` |     17 | entrada de alto impacto |
|  33 | Londres                                 | `PLACE` / `PLACE`          |     17 | entrada de alto impacto |
|  34 | Minimalismo                             | `ABSTRACTION` / `MOVEMENT` |     17 | entrada de alto impacto |
|  35 | Paisaje                                 | `ABSTRACTION` / `CONCEPT`  |     17 | entrada de alto impacto |
|  36 | Reproducción                            | `ABSTRACTION` / `CONCEPT`  |     17 | entrada de alto impacto |
|  37 | Retrato                                 | `ABSTRACTION` / `CONCEPT`  |     17 | entrada de alto impacto |
|  38 | Mármol                                  | `ABSTRACTION` / `CONCEPT`  |     16 | entrada de alto impacto |
|  39 | Arte africano                           | `ABSTRACTION` / `MOVEMENT` |     15 | entrada de alto impacto |
|  40 | Espacio público                         | `ABSTRACTION` / `CONCEPT`  |     15 | entrada de alto impacto |
|  41 | Expresionismo abstracto                 | `ABSTRACTION` / `MOVEMENT` |     15 | entrada de alto impacto |
|  42 | La gran ola de Kanagawa                 | `WORK` / `ARTWORK`         |     15 | entrada de alto impacto |
|  43 | Las Meninas                             | `WORK` / `ARTWORK`         |     15 | entrada de alto impacto |
|  44 | Arquitectura                            | `ABSTRACTION` / `CONCEPT`  |     14 | entrada de alto impacto |
|  45 | Arte griego                             | `ABSTRACTION` / `MOVEMENT` |     14 | entrada de alto impacto |
|  46 | Berlín                                  | `PLACE` / `PLACE`          |     14 | entrada de alto impacto |
|  47 | Casa de la Cascada                      | `WORK` / `ARTWORK`         |     13 | entrada de alto impacto |
|  48 | Ciudad de México                        | `PLACE` / `PLACE`          |     13 | entrada de alto impacto |
|  49 | Cubismo                                 | `ABSTRACTION` / `MOVEMENT` |     13 | entrada de alto impacto |
|  50 | Edad Media                              | `ABSTRACTION` / `PERIOD`   |     13 | entrada de alto impacto |
|  51 | El nacimiento de Venus                  | `WORK` / `ARTWORK`         |     13 | entrada de alto impacto |
|  52 | Las dos Fridas                          | `WORK` / `ARTWORK`         |     13 | entrada de alto impacto |
|  53 | Maman                                   | `WORK` / `ARTWORK`         |     13 | entrada de alto impacto |
|  54 | Muralismo mexicano                      | `ABSTRACTION` / `MOVEMENT` |     13 | entrada de alto impacto |
|  55 | Neoclasicismo                           | `ABSTRACTION` / `MOVEMENT` |     13 | entrada de alto impacto |
|  56 | Olympia                                 | `WORK` / `ARTWORK`         |     13 | entrada de alto impacto |
|  57 | Arquitectura moderna                    | `ABSTRACTION` / `MOVEMENT` |     12 | entrada de alto impacto |
|  58 | Busto de Nefertiti                      | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  59 | David                                   | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  60 | Edificio Bauhaus de Dessau              | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  61 | El 3 de mayo de 1808                    | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  62 | From Here I Saw What Happened           | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  63 | La Gioconda                             | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  64 | La escuela de Atenas                    | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  65 | Madre migrante                          | `WORK` / `ARTWORK`         |     12 | entrada de alto impacto |
|  66 | Memoria                                 | `ABSTRACTION` / `CONCEPT`  |     12 | entrada de alto impacto |
|  67 | Película fotográfica                    | `ABSTRACTION` / `CONCEPT`  |     12 | entrada de alto impacto |
|  68 | Pop Art                                 | `ABSTRACTION` / `MOVEMENT` |     12 | entrada de alto impacto |
|  69 | Rococo                                  | `ABSTRACTION` / `MOVEMENT` |     12 | entrada de alto impacto |
|  70 | Ámsterdam                               | `PLACE` / `PLACE`          |     12 | entrada de alto impacto |
|  71 | Arte indio                              | `ABSTRACTION` / `MOVEMENT` |     11 | entrada de alto impacto |
|  72 | Díptico de Marilyn                      | `WORK` / `ARTWORK`         |     11 | entrada de alto impacto |
|  73 | Guerra                                  | `ABSTRACTION` / `CONCEPT`  |     11 | entrada de alto impacto |
|  74 | La noche estrellada                     | `WORK` / `ARTWORK`         |     11 | entrada de alto impacto |
|  75 | La última cena                          | `WORK` / `ARTWORK`         |     11 | entrada de alto impacto |
|  76 | Madrid                                  | `PLACE` / `PLACE`          |     11 | entrada de alto impacto |
|  77 | Violencia                               | `ABSTRACTION` / `CONCEPT`  |     11 | entrada de alto impacto |
|  78 | Abstracción                             | `ABSTRACTION` / `CONCEPT`  |     10 | entrada de alto impacto |
|  79 | Arte romano                             | `ABSTRACTION` / `MOVEMENT` |     10 | entrada de alto impacto |
|  80 | Constructivismo                         | `ABSTRACTION` / `MOVEMENT` |     10 | entrada de alto impacto |
|  81 | El hombre en la encrucijada             | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  82 | El juramento de los Horacios            | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  83 | Faces and Phases                        | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  84 | Fotografía moderna                      | `ABSTRACTION` / `MOVEMENT` |     10 | entrada de alto impacto |
|  85 | Fuente                                  | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  86 | Gran Mezquita de Djenné                 | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  87 | La joven de la perla                    | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  88 | Lluvia repentina sobre el puente Ohashi | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  89 | Moscú                                   | `PLACE` / `PLACE`          |     10 | entrada de alto impacto |
|  90 | Seascapes                               | `WORK` / `ARTWORK`         |     10 | entrada de alto impacto |
|  91 | Talla                                   | `ABSTRACTION` / `CONCEPT`  |     10 | entrada de alto impacto |
|  92 | Doríforo                                | `WORK` / `ARTWORK`         |      9 | entrada de alto impacto |
|  93 | La vocación de san Mateo                | `WORK` / `ARTWORK`         |      9 | entrada de alto impacto |
|  94 | Mont Sainte-Victoire                    | `WORK` / `ARTWORK`         |      9 | entrada de alto impacto |
|  95 | Semillas de girasol                     | `WORK` / `ARTWORK`         |      9 | entrada de alto impacto |
|  96 | São Paulo                               | `PLACE` / `PLACE`          |      9 | entrada de alto impacto |
|  97 | Venus de Urbino                         | `WORK` / `ARTWORK`         |      9 | entrada de alto impacto |
|  98 | Art Nouveau                             | `ABSTRACTION` / `MOVEMENT` |      8 | entrada de alto impacto |
|  99 | Dama con lámpara                        | `WORK` / `ARTWORK`         |      8 | entrada de alto impacto |
| 100 | Dama en la calle                        | `WORK` / `ARTWORK`         |      8 | entrada de alto impacto |

## 31. Recommended Next Steps

### P0 — Foundation problems

Revisar Toledo y aliases sin modificar todavía.

### P1 — Foundational expansion

Densificar continuidad premoderna/no occidental antes de añadir volumen aleatorio.

### P2 — Editorial enrichment

Fichas concisas y metadata verificable para Tier A.

### P3 — Visual enrichment

~195 imágenes en la primera fase.

### P4 — Deeper expansion

Diseño, artes decorativas, cine, eventos e instituciones según línea editorial.

## Evidence

Métricas calculadas desde las 2.340 relaciones de DB cuyos extremos pertenecen a los 768 slugs del catálogo. Degree = incoming + outgoing; caminos/componentes exploran ambas direcciones para navegación. Gaps comprobados sólo contra canonical, slug, alias y traducciones disponibles. Clasificaciones geográficas, disciplinares y cronológicas son lecturas aproximadas, no campos nativos salvo donde el catálogo lo expresa.
