import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, CONTROL } from "../constants/theme";
import { MotionTouchableOpacity } from "./MotionTouchableOpacity";

export interface CategoryOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface CategoryOptionGridProps {
  options: CategoryOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryOptionGrid({ options, selectedId, onSelect }: CategoryOptionGridProps) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const selected = selectedId === option.id;
        return (
          <MotionTouchableOpacity
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onSelect(option.id)}
          >
            <Ionicons
              name={option.icon}
              size={CONTROL.categoryIconSize}
              color={selected ? C.primary : C.text2}
            />
            <Text
              numberOfLines={2}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {option.label}
            </Text>
          </MotionTouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  option: {
    width: "48%",
    minHeight: CONTROL.categoryTileHeight,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
  },
  optionSelected: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  label: {
    minHeight: 32,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: C.text2,
  },
  labelSelected: {
    color: C.primary,
  },
});
