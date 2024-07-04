const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");

// Ссылки на файлы для скачивания
const netUrls = [
	"https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B790DFF83-1E61-7AC5-930D-3D463EBB6D3C%7D%26lang%3Dru%26browser%3D4%26usagestats%3D0%26appname%3DGoogle%2520Chrome%26needsadmin%3Dprefers%26ap%3Dx64-statsdef_1%26installdataindex%3Dempty/update2/installers/ChromeSetup.exe",
	"https://cdn.zoom.us/prod/6.0.11.39959/x64/ZoomInstallerFull.exe",
	"https://memreduct.org/files/memreduct-3.4-setup.exe",
	"https://td.telegram.org/tx64/tsetup-x64.5.1.5.exe",
	"https://download.cdn.viber.com/desktop/windows/ViberSetup.exe",
	"https://mirror.mangohost.net/videolan/vlc/3.0.20/win64/vlc-3.0.20-win64.exe",
	"https://download.anydesk.com/AnyDesk.exe",
	"https://www.hibitsoft.ir/HiBitUninstaller/HiBitUninstaller-setup-3.2.20.exe",
	"https://zagkichkasfiles6.com/kim/WinRAR_7_01_key.zip",
	// Добавьте другие ссылки на файлы
];
const linkUrls = [
	"https://apps.microsoft.com/detail/9pm6w4f0xw3h?hl=ru-ru&gl=RU",
	"https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6.8/npp.8.6.8.Installer.x64.exe",
	"https://apps.microsoft.com/detail/9wzdncrfj3b4?hl=ru-ru&gl=RU",
];

const localUrls = getFilesInDirectory("storage").map((s) => `storage/${s}`);

function getFilesInDirectory(directoryPath) {
	try {
		const files = fs.readdirSync(directoryPath);
		return files;
	} catch (error) {
		console.error("Ошибка при чтении директории:", error.message);
		return [];
	}
}

// Все пути
const allPaths = [];
// Пробелы
const rr = " ".repeat(20);

// Папка для сохранения файлов
const destinationFolder = "./package";
const archiverPath = process.env.ARCHIVER_PATH;
// Получить расширение файла
const getExtension = (url) => url.split(".")[url.split(".").length - 1];

// Скопировать локальный файл
async function copyLocalFile(src, dest) {
	process.stdout.write("Создание ярлыка...");
	try {
		await fs.promises.copyFile(src, dest);
		process.stdout.write(`\rФайл успешно скопирован: ${dest}${rr}\n`);
	} catch (err) {
		process.stdout.write(`\rОшибка при копировании файла: ${err}${rr}\n`);
	}
}

// Создать ярлык для страницы
async function createWindowsShortcut(url, outputPath) {
	process.stdout.write("Создание ярлыка...");
	const shortcutContent = `
	[InternetShortcut]
	URL=${url}
	`;

	try {
		await fs.promises.writeFile(outputPath, shortcutContent, "utf8");
		process.stdout.write(`\rЯрлык успешно создан: ${outputPath}${rr}\n`);
	} catch (error) {
		process.stdout.write(
			`\rОшибка при создании ярлыка: ${error.message}${rr}\n`
		);
	}
}

// Загрузить интернет файл
async function downloadNetFile(url, filePath) {
	process.stdout.write(`Загрузка: ${filePath}`);
	const fileStream = fs.createWriteStream(filePath);
	await new Promise((resolve, reject) => {
		https
			.get(url, (response) => {
				response.pipe(fileStream);
				fileStream.on("finish", () => {
					fileStream.close();
					process.stdout.write(`\rСкачано: ${filePath}${rr}\n`);
					resolve();
				});
			})
			.on("error", (err) => {
				reject(err);
				process.stdout.write(
					`Произошла ошибка при скачивании ${filePath}: ${err}${rr}\n`
				);
			});
	});
}

// Загрузить все интернет файлы
async function downloadFiles(order) {
	console.log("Загрузка файлов...");

	for (let i = 0; i < netUrls.length; i++) {
		const url = netUrls[i];

		const ext = getExtension(url);
		const fileName = `${order + i}.${ext}`;
		const filePath = `${destinationFolder}/${fileName}`;
		allPaths.push(filePath);
		await downloadNetFile(url, filePath);
	}
}
// Создать все интернет ссылки
async function createLinks(order) {
	console.log("Копирование файлов...");

	for (let i = 0; i < localUrls.length; i++) {
		const url = localUrls[i];
		const fileName = `${order + i}.${getExtension(url)}`;
		const filePath = `${destinationFolder}/${fileName}`;
		allPaths.push(filePath);
		await copyLocalFile(url, filePath);
	}
}
// Скопировать все локальные файлы
async function copyFiles(order) {
	console.log("Создание ярлыков...");

	for (let i = 0; i < linkUrls.length; i++) {
		const url = linkUrls[i];
		const fileName = `${order + i}.url`;
		const filePath = `${destinationFolder}/${fileName}`;
		allPaths.push(filePath);
		await createWindowsShortcut(url, filePath);
	}
}

// Конвертация в SFX-архив
function convertToSFX() {
	process.stdout.write("Создание SFX архива...");
	const sfxFileName = `${destinationFolder}/Setup.exe`;

	exec(
		`"${archiverPath}" a -sfx "${sfxFileName}" ${allPaths.join(" ")}`,
		(error, stdout, stderr) => {
			if (error) {
				process.stdout.write(
					`\rОшибка создания SFX архива: ${error.message}${rr}\n`
				);
			} else {
				process.stdout.write(`\rСоздан SFX архив: ${sfxFileName}${rr}\n`);
			}
		}
	);
}

// Запуск загрузки и конвертации
(async () => {
	try {
		console.log("Проверка папки...");
		if (!fs.existsSync(destinationFolder)) {
			console.log(`Создание папки ${destinationFolder}`);
			await fs.promises.mkdir(destinationFolder);
		} else {
			console.log(`Папка ${destinationFolder} уже существует, очистка`);
			await fs.promises.rm(destinationFolder, { recursive: true });
			fs.mkdirSync(destinationFolder);
		}
		let index = 0;
		await downloadFiles(index);
		await createLinks(index + netUrls.length);
		await copyFiles(index + netUrls.length + localUrls.length);
		convertToSFX();
	} catch (err) {
		console.error("Ошибка:", err.message);
		console.log(`Удаление -> ${destinationFolder}`);
		fs.rm(destinationFolder, { recursive: true });
	}
})();
