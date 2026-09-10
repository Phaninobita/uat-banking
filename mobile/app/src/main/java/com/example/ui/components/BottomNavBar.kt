package com.example.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MobileTab
import com.example.ui.theme.*

@Composable
fun BottomNavBar(
    selectedTab: MobileTab,
    unreadCount: Int,
    onTabSelected: (MobileTab) -> Unit
) {
    NavigationBar(
        containerColor = FnbSurface,
        tonalElevation = 8.dp
    ) {
        // Tab 1: Banking
        NavigationBarItem(
            selected = selectedTab == MobileTab.BANKING,
            onClick = { onTabSelected(MobileTab.BANKING) },
            icon = {
                Icon(
                    imageVector = Icons.Default.AccountBalance,
                    contentDescription = "Banking",
                    modifier = Modifier.size(22.dp)
                )
            },
            label = {
                Text(
                    text = "Banking",
                    fontSize = 11.sp,
                    color = if (selectedTab == MobileTab.BANKING) FnbPrimary else FnbTextSecondary
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = FnbDarkBg,
                selectedTextColor = FnbPrimary,
                indicatorColor = FnbPrimary,
                unselectedIconColor = FnbTextSecondary,
                unselectedTextColor = FnbTextSecondary
            )
        )

        // Tab 2: Onboarding
        NavigationBarItem(
            selected = selectedTab == MobileTab.ONBOARDING,
            onClick = { onTabSelected(MobileTab.ONBOARDING) },
            icon = {
                Icon(
                    imageVector = Icons.Default.Assignment,
                    contentDescription = "Onboarding",
                    modifier = Modifier.size(22.dp)
                )
            },
            label = {
                Text(
                    text = "Onboarding",
                    fontSize = 11.sp,
                    color = if (selectedTab == MobileTab.ONBOARDING) FnbPrimary else FnbTextSecondary
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = FnbDarkBg,
                selectedTextColor = FnbPrimary,
                indicatorColor = FnbPrimary,
                unselectedIconColor = FnbTextSecondary,
                unselectedTextColor = FnbTextSecondary
            )
        )

        // Tab 3: RM Suite
        NavigationBarItem(
            selected = selectedTab == MobileTab.RM_SUITE,
            onClick = { onTabSelected(MobileTab.RM_SUITE) },
            icon = {
                Icon(
                    imageVector = Icons.Default.BusinessCenter,
                    contentDescription = "RM Suite",
                    modifier = Modifier.size(22.dp)
                )
            },
            label = {
                Text(
                    text = "RM Suite",
                    fontSize = 11.sp,
                    color = if (selectedTab == MobileTab.RM_SUITE) FnbGold else FnbTextSecondary
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = FnbDarkBg,
                selectedTextColor = FnbGold,
                indicatorColor = FnbGold,
                unselectedIconColor = FnbTextSecondary,
                unselectedTextColor = FnbTextSecondary
            )
        )

        // Tab 4: Inbox / Activity
        NavigationBarItem(
            selected = selectedTab == MobileTab.INBOX,
            onClick = { onTabSelected(MobileTab.INBOX) },
            icon = {
                BadgedBox(
                    badge = {
                        if (unreadCount > 0) {
                            Badge(
                                containerColor = FnbPrimary,
                                contentColor = FnbDarkBg
                            ) {
                                Text(text = "$unreadCount", fontSize = 9.sp)
                            }
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Mail,
                        contentDescription = "Inbox",
                        modifier = Modifier.size(22.dp)
                    )
                }
            },
            label = {
                Text(
                    text = "Inbox",
                    fontSize = 11.sp,
                    color = if (selectedTab == MobileTab.INBOX) FnbPrimary else FnbTextSecondary
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = FnbDarkBg,
                selectedTextColor = FnbPrimary,
                indicatorColor = FnbPrimary,
                unselectedIconColor = FnbTextSecondary,
                unselectedTextColor = FnbTextSecondary
            )
        )
    }
}
