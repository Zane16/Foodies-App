import { Ionicons } from "@expo/vector-icons"
import { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { useEffect, useRef } from "react"
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Colors } from "../../constants/Colors"

const icons: Record<string, any> = {
  home: { active: "home", inactive: "home-outline" },
  cart: { active: "cart", inactive: "cart-outline" },
  messages: { active: "chatbubble-ellipses", inactive: "chatbubble-ellipses-outline" },
  profile: { active: "person", inactive: "person-outline" },
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const slideAnim = useRef(new Animated.Value(state.index)).current

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start()
  }, [state.index])

  const numberOfTabs = state.routes.length
  const indicatorWidth = 100 / numberOfTabs

  return (
    <View style={styles.tabBar}>
      {/* Sliding Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: `${indicatorWidth}%`,
            left: slideAnim.interpolate({
              inputRange: [0, numberOfTabs - 1],
              outputRange: ['0%', `${(numberOfTabs - 1) * indicatorWidth}%`],
            }),
          },
        ]}
      >
        <View style={styles.indicatorBar} />
      </Animated.View>

      {/* Tab Buttons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const label = options.title || route.name
        const isFocused = state.index === index
        const iconName = icons[route.name]

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFocused ? iconName.active : iconName.inactive}
              size={24}
              color={isFocused ? Colors.light.secondary : Colors.light.icon}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? Colors.light.secondary : Colors.light.icon },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopColor: Colors.light.border,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    height: Platform.OS === "ios" ? 90 : 68,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 0,
    height: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorBar: {
    width: "60%",
    height: 4,
    backgroundColor: Colors.light.secondary,
    borderRadius: 2,
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
})
