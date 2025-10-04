import { Image } from "expo-image";
import { View, Dimensions } from "react-native";

const IMAGE_SIZE = {
	width: 285 * 0.5, // scale down by 0.5
	height: 363.47 * 0.5,
};

export default function BackgroundPattern() {
	const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
	const cols = Math.ceil(screenWidth / IMAGE_SIZE.width);
	const rows = Math.ceil(screenHeight / IMAGE_SIZE.height);

	return (
		<View className="absolute inset-0 overflow-hidden">
			{Array.from({ length: rows }).map((_, rowIdx) => (
				<View key={rowIdx} className="flex-row">
					{Array.from({ length: cols }).map((_, colIdx) => (
						<Image
							key={colIdx}
							source={require("@/assets/vector/grid.svg")}
							style={{
								width: IMAGE_SIZE.width,
								height: IMAGE_SIZE.height,
								opacity: 0.015,
							}}
						/>
					))}
				</View>
			))}
		</View>
	);
}
