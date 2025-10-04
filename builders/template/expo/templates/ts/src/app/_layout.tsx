import "@/styles/global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
	BricolageGrotesque_400Regular,
	BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import {
	DMMono_400Regular,
	DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import {
	Inter_400Regular,
	Inter_500Medium,
	Inter_600SemiBold,
	Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
	InstrumentSerif_400Regular,
	InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts({
		// Bricolage Grotesque
		"BricolageGrotesque-Regular": BricolageGrotesque_400Regular,
		"BricolageGrotesque-Bold": BricolageGrotesque_700Bold,
		// DM Sans
		"DMSans-Regular": DMSans_400Regular,
		"DMSans-Bold": DMSans_700Bold,
		// DM Mono
		"DMMono-Regular": DMMono_400Regular,
		"DMMono-Medium": DMMono_500Medium,
		// Inter
		"Inter-Regular": Inter_400Regular,
		"Inter-Medium": Inter_500Medium,
		"Inter-SemiBold": Inter_600SemiBold,
		"Inter-Bold": Inter_700Bold,
		// Instrument Serif
		"InstrumentSerif-Regular": InstrumentSerif_400Regular,
		"InstrumentSerif-Italic": InstrumentSerif_400Regular_Italic,
	});

	useEffect(() => {
		if (fontsLoaded || fontError) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError]);

	if (!fontsLoaded && !fontError) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<StatusBar style="auto" />
			<Stack>
				<Stack.Screen
					name="index"
					options={{
						headerShown: false,
					}}
				/>
			</Stack>
		</GestureHandlerRootView>
	);
}
