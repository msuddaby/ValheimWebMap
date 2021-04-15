import constants from "./constants";
import websocket from "./websocket";
import map from "./map";
import players from "./players";

const mapImage = document.createElement('img');
const fogImage = document.createElement('img');

const fetchMap = () => new Promise((res) => {
	fetch('/map').then(res => res.blob()).then((mapBlob) => {
		mapImage.onload = res;
		mapImage.src = URL.createObjectURL(mapBlob);
	});
});

const fetchFog = () => new Promise((res) => {
	fogImage.onload = res;
	fogImage.src = 'fog';
});

const fetchConfig = fetch('/config').then(res => res.json()).then(config => {
	constants.CANVAS_WIDTH = config.texture_size || 2048;
	constants.CANVAS_HEIGHT = config.texture_size || 2048;
	constants.PIXEL_SIZE = config.pixel_size || 12;
	constants.EXPLORE_RADIUS = config.explore_radius || 100;
});

const setup = async () => {
	websocket.init();
	players.init();

	await Promise.all([
		fetchMap(),
		fetchFog(),
		fetchConfig
	]);

	map.init({
		mapImage,
		fogImage
	});

	map.addIcon({
		type: 'start',
		x: 0,
		z: 0
	});

	const pings = {};
	websocket.addActionListener('ping', (ping) => {
		let mapIcon = pings[ping.playerId];
		if (!mapIcon) {
			mapIcon = { ...ping };
			mapIcon.type = 'ping';
			mapIcon.text = ping.name;
			map.addIcon(mapIcon, false);
			pings[ping.playerId] = mapIcon;
		}
		mapIcon.x = ping.x;
		mapIcon.z = ping.z;
		map.updateIcons();

		clearTimeout(mapIcon.timeoutId);
		mapIcon.timeoutId = setTimeout(() => {
			delete pings[ping.playerId];
			map.removeIcon(mapIcon);
		}, 8000);
	});

	fetch('pins').then(res => res.text()).then(text => {
		const lines = text.split('\n');
		lines.forEach(line => {
			const lineParts = line.split(',');
			const pin = {
				id: lineParts[1],
				uid: lineParts[0],
				type: lineParts[2],
				name: lineParts[3],
				x: lineParts[4],
				z: lineParts[5],
				text: lineParts[6]
			};
			map.addIcon(pin, false);
		});
		map.updateIcons();
	});

	websocket.addActionListener('pin', (pin) => {
		map.addIcon(pin);
	});

	websocket.addActionListener('rmpin', (pinid) => {
		map.removeIconById(pinid);
	});

	window.addEventListener('resize', () => {
		map.update();
	});
};

setup();