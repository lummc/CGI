let trazos = [];
let cantidadTrazos = 27;

let fondos = [];
let fondoActual = 0;
let fondoAnterior = 0;
let transicionFondo = 1;

let dibujos = [];
let maxTrazos = 120;

let mic;
let fft;
let audioActivo = false;
let audioIniciado = false;

let amplitud = 0;
let graves = 0;
let medios = 0;
let agudos = 0;
let duracionSonido = 0;
let estadoSonoro = "silencio";

let umbralSonido = 0.010;
let umbralAlto = 0.025;
let ultimoAgregar = 0;
let ultimoBorrar = 0;
let ultimoFondo = 0;
let intervaloAgregar = 260;
let intervaloBorrar = 520;
let intervaloFondo = 1800;

let mostrarPanelDebug = true;
let mostrarLogsTrazos = true;
let ultimoLogTrazos = 0;

let nucleoX;
let nucleoY;
let nucleoBaseX;
let nucleoBaseY;

let desviacionX;
let desviacionY;
let desviacionBaseX;
let desviacionBaseY;

let anguloDominante;
let anguloObjetivo;
let angulosPorFondo = [0, 25, -30, 80, -18, 45];

function preload() {
  for (let i = 1; i <= cantidadTrazos; i++) {
    trazos[i] = loadImage("trazos/trazo" + i + ".png");
  }

  for (let i = 0; i <= 5; i++) {
    fondos[i] = loadImage("fondos/fondo" + i + ".png");
  }
}

function setup() {
  createCanvas(720, 1080);
  imageMode(CORNER);
  textFont("monospace");

  inicializarComposicion();

  mic = new p5.AudioIn();
  fft = new p5.FFT(0.85, 1024);
  fft.setInput(mic);
}

function draw() {
  analizarAudio();
  actualizarEstadoSonoro();
  actualizarObra();

  dibujarFondo();
  dibujarTrazos();

  if (mostrarPanelDebug) {
    mostrarDebug();
  }
}

function mousePressed() {
  activarAudio();
}

function keyPressed() {
  if (key === "a" || key === "A") {
    activarAudio();
  }

  if (key === "r" || key === "R") {
    borrarTrazo();
  }

  if (key === "f" || key === "F" || key === " ") {
    cambiarFondo();
  }

  if (key === "x" || key === "X") {
    reiniciarObra();
  }

  if (key === "d" || key === "D") {
    mostrarPanelDebug = !mostrarPanelDebug;
  }

  if (key === "t" || key === "T") {
    agregarTrazo("fino");
  }
}

function activarAudio() {
  if (audioIniciado) {
    return;
  }

  userStartAudio().then(function () {
    mic.start(
      function () {
        fft.setInput(mic);
        audioActivo = true;
        audioIniciado = true;
      },
      function () {
        audioActivo = false;
        audioIniciado = false;
      }
    );
  });
}

function analizarAudio() {
  if (!audioActivo) {
    amplitud = 0;
    graves = 0;
    medios = 0;
    agudos = 0;
    duracionSonido = 0;
    return;
  }

  amplitud = mic.getLevel();

  fft.analyze();
  graves = fft.getEnergy("bass");
  medios = fft.getEnergy("mid");
  agudos = fft.getEnergy("treble");

  if (amplitud > umbralSonido) {
    duracionSonido += deltaTime;
  } else {
    duracionSonido = 0;
  }
}

function actualizarEstadoSonoro() {
  if (!audioActivo) {
    estadoSonoro = "mic inactivo";
    return;
  }

  if (amplitud <= umbralSonido) {
    estadoSonoro = "silencio";
    return;
  }

  let energiaMaxima = max(graves, medios, agudos);
  let energiaMinima = min(graves, medios, agudos);
  let diferenciaBandas = energiaMaxima - energiaMinima;

  if (diferenciaBandas < 18 && amplitud > umbralSonido) {
    estadoSonoro = "no tonal";
  } else if (agudos > medios && amplitud > medios && amplitud > umbralAlto) {
    estadoSonoro = "agudo fuerte";
  } else if (graves > agudos && graves >= medios && amplitud < umbralAlto) {
    estadoSonoro = "grave bajo/medio";
  } else if (duracionSonido > 1400) {
    estadoSonoro = "sostenido";
  } else {
    estadoSonoro = "sonido medio";
  }
}

function actualizarObra() {
  let ahora = millis();

  actualizarComposicionSonora();

  if (estadoSonoro === "silencio" || estadoSonoro === "mic inactivo") {
    respirarObra();
    return;
  }

  if (estadoSonoro === "agudo fuerte" && ahora - ultimoAgregar > intervaloAgregar) {
    agregarTrazo("fino");
    ultimoAgregar = ahora;
  }

  if (estadoSonoro === "grave bajo/medio" && ahora - ultimoFondo > intervaloFondo) {
    cambiarFondo();
    ultimoFondo = ahora;
  }

  if (estadoSonoro === "no tonal" && ahora - ultimoBorrar > intervaloBorrar) {
    borrarTrazo();
    ultimoBorrar = ahora;
  }

  if (estadoSonoro === "sostenido" && ahora - ultimoAgregar > intervaloAgregar * 1.4) {
    agregarTrazo("largo");
    ultimoAgregar = ahora;
  }

  if (transicionFondo < 1) {
    transicionFondo += 0.025;
  } else {
    transicionFondo = 1;
  }
}

function respirarObra() {
  if (transicionFondo < 1) {
    transicionFondo += 0.01;
  }
}

function inicializarComposicion() {
  nucleoBaseX = width * 0.52;
  nucleoBaseY = height * 0.52;
  nucleoX = nucleoBaseX;
  nucleoY = nucleoBaseY;

  desviacionBaseX = width * 0.16;
  desviacionBaseY = height * 0.20;
  desviacionX = desviacionBaseX;
  desviacionY = desviacionBaseY;

  anguloDominante = angulosPorFondo[fondoActual];
  anguloObjetivo = anguloDominante;
}

function actualizarComposicionSonora() {
  let objetivoX = nucleoBaseX;
  let objetivoY = nucleoBaseY;
  let objetivoDesviacionX = desviacionBaseX;
  let objetivoDesviacionY = desviacionBaseY;

  anguloObjetivo = angulosPorFondo[fondoActual];

  if (estadoSonoro === "agudo fuerte") {
    objetivoY = height * 0.42;
    anguloObjetivo -= 8;
  } else if (estadoSonoro === "grave bajo/medio") {
    objetivoY = height * 0.64;
    anguloObjetivo += 6;
  } else if (estadoSonoro === "sostenido") {
    objetivoDesviacionX = width * 0.23;
    objetivoDesviacionY = height * 0.28;
  } else if (estadoSonoro === "no tonal") {
    objetivoX = nucleoBaseX + sin(frameCount * 0.025) * width * 0.04;
    anguloObjetivo += sin(frameCount * 0.02) * 10;
  }

  nucleoX = lerp(nucleoX, objetivoX, 0.025);
  nucleoY = lerp(nucleoY, objetivoY, 0.025);
  desviacionX = lerp(desviacionX, objetivoDesviacionX, 0.02);
  desviacionY = lerp(desviacionY, objetivoDesviacionY, 0.02);
  anguloDominante = lerp(anguloDominante, anguloObjetivo, 0.03);
}

function agregarTrazo(tipo) {
  if (dibujos.length >= maxTrazos) {
    dibujos.shift();
  }

  let margenX = width * 0.08;
  let margenY = height * 0.04;
  let indice = int(random(1, cantidadTrazos + 1));
  let direccion = elegirDireccion(tipo);
  let x = constrain(randomGaussian(nucleoX, desviacionX), margenX, width - margenX);
  let y = constrain(randomGaussian(nucleoY, desviacionY), -margenY, height + margenY);
  let variacionAngular = tipo === "largo" ? 9 : 14;
  let anguloTrazo = anguloDominante + randomGaussian(0, variacionAngular);

  dibujos.push({
    indice: indice,
    x: x,
    y: y,
    altoVisible: 0,
    escala: tipo === "fino" ? random(0.28, 0.58) : random(0.45, 0.9),
    opacidad: tipo === "fino" ? random(35, 85) : random(70, 145),
    velocidad: tipo === "largo" ? random(16, 34) : random(8, 22),
    direccion: direccion,
    angulo: anguloTrazo,
    curva: random(-28, 28)
  });

  if (mostrarLogsTrazos) {
    let dibujoNuevo = dibujos[dibujos.length - 1];
    let imagenTrazo = trazos[dibujoNuevo.indice];

    console.log("agregarTrazo()", {
      cantidadDibujos: dibujos.length,
      indice: dibujoNuevo.indice,
      anchoOriginal: imagenTrazo ? imagenTrazo.width : "imagen no cargada",
      altoOriginal: imagenTrazo ? imagenTrazo.height : "imagen no cargada",
      opacidad: dibujoNuevo.opacidad,
      escala: dibujoNuevo.escala,
      direccion: dibujoNuevo.direccion,
      nucleoX: nucleoX,
      nucleoY: nucleoY,
      desviacionX: desviacionX,
      desviacionY: desviacionY,
      angulo: dibujoNuevo.angulo
    });
  }
}

function elegirDireccion(tipo) {
  if (tipo === "largo") {
    return random(["vertical", "curva"]);
  }

  if (estadoSonoro === "grave bajo/medio") {
    return "horizontal";
  }

  if (estadoSonoro === "sostenido") {
    return random(["vertical", "horizontal", "curva"]);
  }

  return random(["vertical", "vertical", "curva"]);
}

function borrarTrazo() {
  if (dibujos.length > 0) {
    dibujos.splice(int(random(dibujos.length)), 1);
  }
}

function cambiarFondo() {
  fondoAnterior = fondoActual;
  fondoActual++;

  if (fondoActual >= fondos.length) {
    fondoActual = 0;
  }

  anguloObjetivo = angulosPorFondo[fondoActual];
  transicionFondo = 0;
}

function dibujarFondo() {
  background(255);

  tint(255, 255);
  image(fondos[fondoAnterior], 0, 0, width, height);

  tint(255, transicionFondo * 255);
  image(fondos[fondoActual], 0, 0, width, height);
  noTint();
}

function dibujarTrazos() {
  if (mostrarLogsTrazos && millis() - ultimoLogTrazos > 1200) {
    console.log("dibujarTrazos()", {
      cantidadDibujos: dibujos.length,
      estadoSonoro: estadoSonoro,
      amplitud: amplitud,
      graves: graves,
      medios: medios,
      agudos: agudos,
      umbralSonido: umbralSonido,
      umbralAlto: umbralAlto
    });

    ultimoLogTrazos = millis();
  }

  for (let i = 0; i < dibujos.length; i++) {
    let dibujo = dibujos[i];
    let imagenTrazo = trazos[dibujo.indice];

    if (!imagenTrazo) {
      continue;
    }

    let anchoTrazo = imagenTrazo.width * dibujo.escala;
    let altoTrazo = imagenTrazo.height * dibujo.escala;
    let alturaActual = min(dibujo.altoVisible, altoTrazo);

    push();
    translate(dibujo.x, dibujo.y);
    rotate(radians(dibujo.angulo));

    if (dibujo.direccion === "curva") {
      shearX(radians(dibujo.curva * 0.15));
    }

    tint(255, dibujo.opacidad);
    image(
      imagenTrazo,
      -anchoTrazo / 2,
      -altoTrazo / 2,
      anchoTrazo,
      alturaActual,
      0,
      0,
      imagenTrazo.width,
      alturaActual / dibujo.escala
    );
    noTint();
    pop();

    if (dibujo.altoVisible < altoTrazo) {
      dibujo.altoVisible += dibujo.velocidad;
    }
  }
}

function mostrarDebug() {
  push();
  noStroke();
  fill(0, 175);
  rect(16, 16, 350, 325, 6);

  fill(255);
  textSize(15);
  text("click o tecla A: activar audio", 28, 42);
  text("mic activo: " + audioActivo, 28, 68);
  text("amplitud: " + nf(amplitud, 1, 4), 28, 94);
  text("graves: " + int(graves), 28, 120);
  text("medios: " + int(medios), 28, 146);
  text("agudos: " + int(agudos), 28, 172);
  text("duracion: " + int(duracionSonido) + " ms", 28, 198);
  text("estado: " + estadoSonoro, 28, 224);
  text("nucleo: " + int(nucleoX) + ", " + int(nucleoY), 28, 250);
  text("dispersion: " + int(desviacionX) + ", " + int(desviacionY), 28, 276);
  text("angulo: " + int(anguloDominante), 28, 302);

  let barra = map(amplitud, 0, 0.12, 0, 300, true);
  fill(120, 220, 255);
  rect(28, 316, barra, 10);
  pop();
}

function reiniciarObra() {
  dibujos = [];
  fondoActual = 0;
  fondoAnterior = 0;
  transicionFondo = 1;
  duracionSonido = 0;
  estadoSonoro = audioActivo ? "silencio" : "mic inactivo";
  inicializarComposicion();
}
