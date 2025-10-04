import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import BackgroundPattern from "@/components/ui/background-pattern";

export default function App() {
	return (
		<ScrollView className="flex-1 bg-[#171513]">
			<View className="min-h-screen flex flex-col items-center justify-center p-8 lg:p-40">
				<BackgroundPattern />

				<View className="relative z-10 flex flex-col items-center gap-6">
					<View className="flex flex-col items-center gap-1">
						<View className="flex flex-row items-center gap-4">
							<Image
								source={require("@/assets/vector/loafy.svg")}
								style={{ width: 31, height: 24 }}
								contentFit="contain"
							/>
							<View className="w-px h-4 bg-white" />
							<Text className="text-white text-2xl font-bricolage-grotesque">
								Loafy
							</Text>
						</View>
						<Text className="text-white font-dm-mono text-base">
							expo template - v{{config.version}}
						</Text>
					</View>

					{/* Main content card */}
					<View className="relative w-full max-w-sm lg:w-[30rem] lg:max-w-none bg-[#0C0A09] border border-[#29241F] rounded-3xl flex flex-col p-4 px-6 items-center gap-4">
						<View className="relative z-10 flex flex-col items-center p-4 px-6 gap-10">
							<View>
								<Text className="text-white text-xl font-dm-mono">
									Get started by editing{" "}
								</Text>
								<Text className="text-blue-700 text-xl text-center font-inter">
									src/app/index.tsx
								</Text>
							</View>

							{/* Bauhaus design */}
							<View className="relative">
								<Image
									source={require("@/assets/vector/bauhaus.svg")}
									style={{ width: 500 * 0.5, height: 200 * 0.5 }}
									contentFit="contain"
								/>
							</View>
						</View>
						<Text className="text-white font-instrument-serif text-xl text-start w-full">
							<Text className="text-destructive/80">
								<Text className="line-through">Build</Text>,
							</Text>{" "}
							Code, Ship, Fast.
						</Text>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
