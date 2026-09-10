package com.example.voice

import com.example.ui.MobileTab

sealed class VoiceAction {
    data class SetCrn(val crn: String) : VoiceAction()
    data class SetEmail(val email: String) : VoiceAction()
    object RequestOtp : VoiceAction()
    data class SetOtp(val otp: String) : VoiceAction()
    object AutoFillOtp : VoiceAction()
    object VerifyOtp : VoiceAction()
    object BackToLoginStep1 : VoiceAction()
    object NextStep : VoiceAction()
    object PreviousStep : VoiceAction()
    data class GoToStep(val stepNumber: Int) : VoiceAction()
    object ToggleRework : VoiceAction()
    object SubmitApplication : VoiceAction()
    object SignOut : VoiceAction()
    data class SetCompanyName(val name: String) : VoiceAction()
    data class SetTradeName(val name: String) : VoiceAction()
    data class SwitchTab(val tab: MobileTab) : VoiceAction()
    data class Unknown(val rawText: String) : VoiceAction()
}

object VoiceCommandParser {

    /**
     * Converts spelled out digit words into numeric strings so speech
     * recognizer variations like "one two three" become "123".
     */
    fun normalizeSpokenDigits(input: String): String {
        var res = input.lowercase().trim()
        val wordToDigit = listOf(
            "zero" to "0",
            "one" to "1",
            "two" to "2",
            "three" to "3",
            "four" to "4",
            "five" to "5",
            "six" to "6",
            "seven" to "7",
            "eight" to "8",
            "nine" to "9"
        )
        for ((word, digit) in wordToDigit) {
            res = res.replace(Regex("\\b$word\\b"), digit)
        }
        return res
    }

    fun parse(rawInput: String): VoiceAction {
        val trimmed = rawInput.trim()
        val lower = trimmed.lowercase()
        val normalizedDigits = normalizeSpokenDigits(lower)

        // 1. CRN field commands
        // e.g., "my cr no is 123", "cr no 123", "cr number is 123", "crn 509077205", "set crn to 123"
        val crnRegex1 = Regex("""(?:my\s+)?(?:cr|crn)(?:\s+no|\s+number)?(?:\s+is)?\s*([0-9\s]+)""")
        val crnMatch1 = crnRegex1.find(normalizedDigits)
        if (crnMatch1 != null) {
            val digits = crnMatch1.groupValues[1].replace(" ", "").trim()
            if (digits.isNotEmpty()) {
                return VoiceAction.SetCrn(digits)
            }
        }

        val crnRegex2 = Regex("""(?:insert|set|fill|enter|type)\s+(?:my\s+)?(?:cr|crn|cr no|cr number)(?:\s+to|\s+as|\s+is)?\s*([0-9\s]+)""")
        val crnMatch2 = crnRegex2.find(normalizedDigits)
        if (crnMatch2 != null) {
            val digits = crnMatch2.groupValues[1].replace(" ", "").trim()
            if (digits.isNotEmpty()) {
                return VoiceAction.SetCrn(digits)
            }
        }

        // 2. Click on Request Verification OTP
        // e.g., "click on request verification otp", "request verification otp", "request otp", "click request otp"
        if (lower.contains("request") && lower.contains("otp")) {
            return VoiceAction.RequestOtp
        }
        if (lower.contains("click on request") || lower.contains("request verification") || lower.contains("send otp") || lower.contains("get otp")) {
            return VoiceAction.RequestOtp
        }

        // 3. Auto-fill OTP
        // e.g., "auto fill otp", "fill demo otp", "use demo code"
        if (lower.contains("auto fill") || lower.contains("autofill") || lower.contains("demo code") || lower.contains("demo otp")) {
            return VoiceAction.AutoFillOtp
        }

        // 4. OTP input
        // e.g., "my otp is 1111", "otp 1111", "code is 1111", "set otp to 1111"
        val otpRegex = Regex("""(?:my\s+)?(?:otp|access code|verification code|pin)(?:\s+is)?\s*([0-9\s]{4,6})""")
        val otpMatch = otpRegex.find(normalizedDigits)
        if (otpMatch != null) {
            val digits = otpMatch.groupValues[1].replace(" ", "").trim()
            if (digits.isNotEmpty()) {
                return VoiceAction.SetOtp(digits)
            }
        }

        // 5. Verify OTP / Login
        // e.g., "click on verify otp", "verify otp", "verify and access", "verify", "click verify", "login"
        if (lower.contains("verify") || lower.contains("confirm otp") || lower.contains("submit otp") || lower == "login") {
            return VoiceAction.VerifyOtp
        }

        // 6. Back to login step 1
        if (lower.contains("back to crn") || lower.contains("back to login") || lower.contains("change crn")) {
            return VoiceAction.BackToLoginStep1
        }

        // 7. Email field commands
        // e.g., "my email is admin@company.com", "set email to test@domain.com"
        val emailRegex = Regex("""(?:my\s+)?email(?:\s+address|\s+id)?(?:\s+is)?\s*([^\s]+@[^\s]+)""")
        val emailMatch = emailRegex.find(lower)
        if (emailMatch != null) {
            val email = emailMatch.groupValues[1].trim()
            return VoiceAction.SetEmail(email)
        }

        // 8. Navigation: Next Step
        if (lower.contains("next step") || lower.contains("click next") || lower == "next" || lower == "continue" || lower.contains("proceed")) {
            return VoiceAction.NextStep
        }

        // 9. Navigation: Previous Step
        if (lower.contains("previous step") || lower.contains("click back") || lower.contains("go back") || lower == "previous") {
            return VoiceAction.PreviousStep
        }

        // 10. Navigation: Go to Step N
        val stepRegex = Regex("""(?:go to\s+)?step\s*([1-7])""")
        val stepMatch = stepRegex.find(lower)
        if (stepMatch != null) {
            val stepNum = stepMatch.groupValues[1].toIntOrNull()
            if (stepNum != null) {
                return VoiceAction.GoToStep(stepNum)
            }
        }

        // Named steps
        if (lower.contains("documents") || lower.contains("step one")) return VoiceAction.GoToStep(1)
        if (lower.contains("company info") || lower.contains("step two")) return VoiceAction.GoToStep(2)
        if (lower.contains("ubo") || lower.contains("beneficial owners") || lower.contains("step three")) return VoiceAction.GoToStep(3)
        if (lower.contains("ownership") || lower.contains("cap table") || lower.contains("shareholders") || lower.contains("step four")) return VoiceAction.GoToStep(4)
        if (lower.contains("governance") || lower.contains("signatories") || lower.contains("step five")) return VoiceAction.GoToStep(5)
        if (lower.contains("fatca") || lower.contains("crs") || lower.contains("step six")) return VoiceAction.GoToStep(6)
        if (lower.contains("review") || lower.contains("step seven")) return VoiceAction.GoToStep(7)

        // 11. Toggle Rework
        if (lower.contains("simulate rework") || lower.contains("toggle rework") || lower.contains("rework mode")) {
            return VoiceAction.ToggleRework
        }

        // 12. Submit Application
        if (lower.contains("submit application") || lower.contains("click submit") || lower == "submit") {
            return VoiceAction.SubmitApplication
        }

        // 13. Sign Out
        if (lower.contains("sign out") || lower.contains("log out") || lower.contains("exit portal") || lower == "exit") {
            return VoiceAction.SignOut
        }

        // 14. Tab switching
        if (lower.contains("open banking") || lower.contains("go to banking") || lower.contains("treasury")) {
            return VoiceAction.SwitchTab(MobileTab.BANKING)
        }
        if (lower.contains("open onboarding") || lower.contains("go to onboarding")) {
            return VoiceAction.SwitchTab(MobileTab.ONBOARDING)
        }
        if (lower.contains("open rm") || lower.contains("go to rm") || lower.contains("executive portal")) {
            return VoiceAction.SwitchTab(MobileTab.RM_SUITE)
        }
        if (lower.contains("open inbox") || lower.contains("go to inbox") || lower.contains("messages") || lower.contains("mailbox")) {
            return VoiceAction.SwitchTab(MobileTab.INBOX)
        }

        // 15. Company Name / Trade Name
        val compRegex = Regex("""(?:company|legal)\s+name\s+is\s+(.+)""")
        val compMatch = compRegex.find(lower)
        if (compMatch != null) {
            val name = compMatch.groupValues[1].trim()
            if (name.isNotEmpty()) return VoiceAction.SetCompanyName(name)
        }

        val tradeRegex = Regex("""trade\s+name\s+is\s+(.+)""")
        val tradeMatch = tradeRegex.find(lower)
        if (tradeMatch != null) {
            val name = tradeMatch.groupValues[1].trim()
            if (name.isNotEmpty()) return VoiceAction.SetTradeName(name)
        }

        return VoiceAction.Unknown(rawInput)
    }
}
